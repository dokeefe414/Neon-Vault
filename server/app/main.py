"""NEON VAULT v6 API. Bearer auth; no client-provided outcome or credit changes."""
from __future__ import annotations
import os
import secrets
import json
import time
from collections import deque
from datetime import timezone
from typing import Literal
from fastapi import FastAPI, Depends, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession
from pydantic import BaseModel, Field, ConfigDict
from argon2 import PasswordHasher
from .db import Base, engine, get_db, Session, User, Round, Journal, RewardClaim, utcnow
from .security import normalize_username,validate_password,check_password,digest,new_session,current_user,session_from_token,hasher
from . import services, logic
from .trivia import start_trivia, answer_trivia, cashout_trivia, trivia_catalog, public_trivia

ENV=os.getenv("ENVIRONMENT","development")
ORIGINS=[origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS","http://localhost:4173,http://127.0.0.1:4173").split(",") if origin.strip()]
if "*" in ORIGINS:raise RuntimeError("CORS_ORIGINS cannot contain wildcard origins")
app=FastAPI(title="NEON VAULT Cloud API",version="6.0.0",description="Fictional-credit games only. No deposits, purchases, winnings, or withdrawals.")
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS,allow_credentials=False,
                   allow_methods=["GET","POST","PATCH"],allow_headers=["Authorization","Content-Type"])
@app.middleware("http")
async def security_headers(request:Request,call_next):
    response=await call_next(request)
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Referrer-Policy"]="no-referrer"
    response.headers["Cache-Control"]="no-store"
    response.headers["X-Frame-Options"]="DENY"
    response.headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()"
    return response

@app.on_event("startup")
def create_schema():
    # Initial schema bootstrap. Future schema revisions require database migrations.
    Base.metadata.create_all(bind=engine)


# Per-process defense in depth. Put distributed / per-IP rate limits at the TLS proxy as well.
_AUTH_WINDOW=60
_AUTH_LIMIT=14
_login_attempts={}
def throttle_auth(request:Request,account:str):
    key=((request.client.host if request.client else "unknown"),account.lower())
    now=time.monotonic()
    attempts=_login_attempts.setdefault(key,deque())
    while attempts and now-attempts[0]>_AUTH_WINDOW:
        attempts.popleft()
    if len(attempts)>=_AUTH_LIMIT:
        raise HTTPException(429,"Too many authentication attempts. Try again in a minute.")
    attempts.append(now)

class Strict(BaseModel):
    model_config=ConfigDict(extra="forbid")
class Credentials(Strict):
    username:str=Field(min_length=3,max_length=24)
    password:str=Field(min_length=12,max_length=128)
class Profile(Strict):
    display_name:str=Field(min_length=1,max_length=36)
    avatar:str=Field(min_length=1,max_length=12)
    theme:Literal["mint","purple","gold"]
class Operation(Strict):
    key:str=Field(min_length=12,max_length=100)
class Instant(Operation):
    game:Literal["dice","roulette","slots","baccarat"]
    bet:int=Field(ge=100,le=1_000_000)
    selection:str=Field(default="red",max_length=24)
    value:int|None=None
class Deal(Operation):
    bet:int=Field(ge=100,le=1_000_000)
class Draw(Operation):
    round_id:int
    hold:list[bool]=Field(min_length=5,max_length=5)
class RoundAction(Operation):
    round_id:int
    action:Literal["hit","stand","double","split","surrender","insurance","decline"]
class RoundOnly(Operation):
    round_id:int
class TriviaStart(Operation):
    category:str=Field(min_length=1,max_length=48)
class TriviaAnswer(Operation):
    round_id:int
    choice:int=Field(ge=0,le=3)
class CosmeticPurchase(Operation):
    item:str=Field(min_length=2,max_length=32)
class CosmeticEquip(Operation):
    slot:Literal["frame","card_back","felt","badge"]
    item:str=Field(min_length=2,max_length=32)

def user_view(user:User):
    meta=user.profile or {}
    return {"id":user.id,"username":user.username,"display_name":user.display_name,
            "avatar":user.avatar,"theme":user.theme,"cosmetics":{
                "frame":meta.get("frame","none"),"card_back":meta.get("card_back","classic"),
                "felt":meta.get("felt","emerald"),"badge":meta.get("badge","Player"),
                "owned":meta.get("owned",[])},**services.wallet(user)}

@app.get("/healthz")
def health():
    return {"status":"ok","version":"6.0.0"}

@app.post("/api/v1/auth/register",status_code=201)
def register(body:Credentials,request:Request,db:DbSession=Depends(get_db)):
    username=normalize_username(body.username)
    throttle_auth(request,username)
    password=validate_password(body.password)
    if db.scalar(select(User.id).where(User.username==username)) is not None:
        raise HTTPException(409,"Username unavailable")
    user=User(username=username,password_hash=hasher.hash(password),display_name=username,
              balance=100_000,xp=0,style_tokens=0,profile={})
    try:
        db.add(user);db.flush()
        token=new_session(db,user);db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,"Username unavailable")
    return {"token":token,"token_type":"Bearer","profile":user_view(user)}

@app.post("/api/v1/auth/login")
def login(body:Credentials,request:Request,db:DbSession=Depends(get_db)):
    username=normalize_username(body.username)
    throttle_auth(request,username)
    user=db.scalar(select(User).where(User.username==username))
    # Always verify an Argon2 hash; avoid revealing whether the account exists.
    if not user:
        check_password(DUMMY_HASH,body.password)
    if not user or not check_password(user.password_hash,body.password):
        raise HTTPException(401,"Invalid username or password")
    token=new_session(db,user);db.commit()
    return {"token":token,"token_type":"Bearer","profile":user_view(user)}

DUMMY_HASH=hasher.hash("not-a-real-account-password-007")

@app.post("/api/v1/auth/logout")
def logout(authorization:str|None=Header(default=None),db:DbSession=Depends(get_db),
           user:User=Depends(current_user)):
    record=session_from_token(db,authorization)
    if record and record.user_id==user.id:
        record.revoked=True;db.commit()
    return {"status":"signed_out"}

@app.get("/api/v1/me")
def me(user:User=Depends(current_user)):
    return user_view(user)

@app.patch("/api/v1/me")
def update_me(body:Profile,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    user.display_name=body.display_name.strip() or user.username
    user.avatar=body.avatar
    user.theme=body.theme
    db.commit()
    return user_view(user)

@app.get("/api/v1/wallet")
def wallet(user:User=Depends(current_user)):
    return {**services.wallet(user),"currency":"fictional_credit_cents","redeemable":False}

@app.get("/api/v1/history")
def history(limit:int=50,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    if limit<1 or limit>100:raise HTTPException(422,"Limit must be 1–100")
    records=db.scalars(select(Round).where(Round.user_id==user.id,Round.status=="settled").order_by(Round.id.desc()).limit(limit)).all()
    return {"rounds":[{"id":r.id,"game":r.game,"wager":r.wager,"payout":r.payout,
                       "net":r.payout-r.wager,"result":r.result,"created_at":r.created_at.isoformat()} for r in records]}

@app.get("/api/v1/leaderboard")
def leaderboard(db:DbSession=Depends(get_db)):
    users=db.scalars(select(User).order_by(User.xp.desc(),User.id.asc()).limit(25)).all()
    return {"category":"verified server XP","players":[{"rank":i+1,"username":u.username,
             "display_name":u.display_name,"avatar":u.avatar,"xp":u.xp} for i,u in enumerate(users)]}

@app.get("/api/v1/games/catalog")
def catalog():
    return {"games":["dice","roulette","slots","baccarat","blackjack","poker","trivia"],
            "source":"server","credits":"fictional only","blackjack_side_bets":False,
            "video_poker_house_paytable":logic.POKER_PAYS,"trivia":trivia_catalog()}

@app.post("/api/v1/games/play")
def play(body:Instant,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.play_instant(db,user,body.game,body.bet,body.selection,body.value,body.key)

@app.post("/api/v1/poker/deal")
def poker_deal(body:Deal,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.poker_deal(db,user,body.bet,body.key)

@app.post("/api/v1/poker/draw")
def poker_draw(body:Draw,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.poker_draw(db,user,body.round_id,body.hold,body.key)

@app.post("/api/v1/poker/forfeit")
def poker_forfeit(body:RoundOnly,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.poker_forfeit(db,user,body.round_id,body.key)

@app.post("/api/v1/blackjack/start")
def bj_start(body:Deal,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.bj_start(db,user,body.bet,body.key)

@app.post("/api/v1/blackjack/action")
def bj_action(body:RoundAction,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.bj_action(db,user,body.round_id,body.action,body.key)

@app.post("/api/v1/blackjack/forfeit")
def bj_forfeit(body:RoundOnly,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return services.bj_forfeit(db,user,body.round_id,body.key)

@app.get("/api/v1/rounds/active")
def active(user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    rounds=db.scalars(select(Round).where(Round.user_id==user.id,Round.status=="active",Round.game.in_(["Blackjack","Video Poker","Trivia"]))).all()
    result=[]
    for r in rounds:
        if r.game=="Blackjack":
            item={"game":r.game,"round_id":r.id,"table":services.bj_response(r,r.state)}
        elif r.game=="Video Poker":item={"game":r.game,**services.poker_public(r)}
        else:item={"game":r.game,**public_trivia(r)}
        result.append(item)
    return {"rounds":result}

@app.get("/api/v1/trivia/catalog")
def trivia_categories():return trivia_catalog()

@app.post("/api/v1/trivia/start")
def trivia_start(body:TriviaStart,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return start_trivia(db,user,body.category,body.key)

@app.post("/api/v1/trivia/answer")
def trivia_answer(body:TriviaAnswer,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return answer_trivia(db,user,body.round_id,body.choice,body.key)

@app.post("/api/v1/trivia/cashout")
def trivia_cashout(body:RoundOnly,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    return cashout_trivia(db,user,body.round_id,body.key)

SHOP={"card-neon":("card_back","neon",8),"card-aurora":("card_back","aurora",10),
      "felt-midnight":("felt","midnight",8),"felt-sapphire":("felt","sapphire",9),
      "badge-strategist":("badge","Strategist",8),"badge-royalty":("badge","Vault Royalty",12)}
RANKS={"bronze":(1000,4),"silver":(2500,8),"gold":(5000,12),"diamond":(10000,20)}

@app.post("/api/v1/rewards/daily")
def daily_reward(body:Operation,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    date=utcnow().date().isoformat()  # Account-wide UTC day, not device-supplied clock.
    claim_key="daily:"+date
    def action():
        already=db.scalar(select(RewardClaim.id).where(RewardClaim.user_id==user.id,RewardClaim.key==claim_key))
        if already:raise HTTPException(409,"Daily gift already claimed")
        db.add(RewardClaim(user_id=user.id,key=claim_key))
        user.style_tokens+=2
        return {"reward":"2 style tokens","day_utc":date}
    return services.execute(db,user,body.key,"rewards:daily",{},action)

@app.post("/api/v1/rewards/prestige/{rank}")
def milestone(rank:str,body:Operation,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    if rank not in RANKS:raise HTTPException(404,"Unknown rank")
    xp,tokens=RANKS[rank]
    def action():
        if user.xp<xp:raise HTTPException(409,"Not enough verified XP")
        claim="prestige:"+rank
        if db.scalar(select(RewardClaim.id).where(RewardClaim.user_id==user.id,RewardClaim.key==claim)):
            raise HTTPException(409,"Already claimed")
        db.add(RewardClaim(user_id=user.id,key=claim))
        user.style_tokens+=tokens
        data=dict(user.profile or {})
        data["owned"]=list(set(data.get("owned",[])+["frame-"+rank]))
        data["frame"]=rank;user.profile=data
        return {"unlocked":rank,"reward_tokens":tokens}
    return services.execute(db,user,body.key,"rewards:prestige",{"rank":rank},action)

@app.get("/api/v1/rewards")
def reward_summary(user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    claimed=db.scalars(select(RewardClaim.key).where(RewardClaim.user_id==user.id)).all()
    return {"claims":claimed,"milestones":RANKS,"shop":{k:{"slot":v[0],"value":v[1],"cost":v[2]} for k,v in SHOP.items()},
            **services.wallet(user)}

@app.post("/api/v1/rewards/buy")
def purchase(body:CosmeticPurchase,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    if body.item not in SHOP:raise HTTPException(404,"Unknown cosmetic")
    slot,value,cost=SHOP[body.item]
    def action():
        profile=dict(user.profile or {});owned=list(profile.get("owned",[]))
        if body.item in owned:raise HTTPException(409,"Already owned")
        if user.style_tokens<cost:raise HTTPException(409,"Not enough style tokens")
        user.style_tokens-=cost;owned.append(body.item);profile["owned"]=owned;profile[slot]=value
        user.profile=profile
        return {"purchased":body.item}
    return services.execute(db,user,body.key,"rewards:buy",{"item":body.item},action)

@app.post("/api/v1/rewards/equip")
def equip(body:CosmeticEquip,user:User=Depends(current_user),db:DbSession=Depends(get_db)):
    base={"frame":"none","card_back":"classic","felt":"emerald","badge":"Player"}
    slot=body.slot;value=body.item
    claim_ids={"frame":{r:"frame-"+r for r in RANKS},
               **{s:{v[1]:k for k,v in SHOP.items() if v[0]==s} for s in ("card_back","felt","badge")}}
    def action():
        profile=dict(user.profile or {})
        if value!=base[slot]:
            required=claim_ids.get(slot,{}).get(value)
            if not required or required not in profile.get("owned",[]):
                raise HTTPException(403,"Cosmetic has not been unlocked")
        profile[slot]=value;user.profile=profile
        return {"equipped":slot,"value":value}
    return services.execute(db,user,body.key,"rewards:equip",{"slot":slot,"item":value},action)
