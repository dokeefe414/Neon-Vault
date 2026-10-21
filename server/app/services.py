"""Single-writer game services: cryptographic outcomes, server-owned balances and replay-safe requests."""
from __future__ import annotations
import hashlib
import json
import re
from secrets import randbelow
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from .db import User, Round, Journal, Idempotency, RewardClaim, utcnow
from . import logic

MAX_AMOUNT=logic.MAX_BET
KEY_RE=re.compile(r"^[A-Za-z0-9_-]{12,100}$")
GAMES={"dice","roulette","slots","baccarat"}
RANKS=["2","3","4","5","6","7","8","9","10","J","Q","K","A"]

def invalid(detail:str,status:int=422):
    raise HTTPException(status,detail)

def wallet(user:User)->dict:
    return {"balance":user.balance,"xp":user.xp,"style_tokens":user.style_tokens}

def wager_check(user:User,amount:int):
    if type(amount) is not int or not 100<=amount<=MAX_AMOUNT or amount%100:
        invalid("Wagers must be $1–$10,000 in whole virtual dollars")
    if amount>user.balance:invalid("Insufficient fictional credits",409)

def change(db:Session,user:User,delta:int,reason:str,round_obj:Round|None=None):
    n=user.balance+delta
    if n<0:invalid("Insufficient fictional credits",409)
    if n>logic.MAX_BALANCE:invalid("Virtual wallet limit reached",409)
    user.balance=n
    db.add(Journal(user_id=user.id,round_id=round_obj.id if round_obj else None,
                   delta=delta,balance_after=n,reason=reason))

def xp_for(user:User,payout:int,stake:int,game:str):
    user.xp=min(10_000_000,user.xp+(30 if payout>stake else 20))
    if game=="Trivia" and stake==0:user.xp=min(10_000_000,user.xp+10)

def execute(db:Session,user:User,key:str,operation:str,args:dict,fn):
    if not KEY_RE.fullmatch(key):invalid("Provide a unique idempotency key (12–100 safe characters)")
    fingerprint=hashlib.sha256(json.dumps({"op":operation,"args":args},sort_keys=True,separators=(",",":")).encode()).hexdigest()
    try:
        # PostgreSQL row-level lock serializes wallet edits across API workers.
        db.refresh(user,with_for_update=True)
        previous=db.scalar(select(Idempotency).where(Idempotency.user_id==user.id,Idempotency.key==key))
        if previous:
            if previous.fingerprint!=fingerprint:invalid("Idempotency key already used for another request",409)
            return previous.response
        answer=fn()
        answer={**answer,**wallet(user)}
        db.add(Idempotency(user_id=user.id,key=key,fingerprint=fingerprint,response=answer))
        db.commit()
        return answer
    except Exception:
        db.rollback()
        raise

def begin_round(db:Session,user:User,game:str,bet:int,private:dict)->Round:
    obj=Round(user_id=user.id,game=game,status="active",wager=bet,state=private)
    db.add(obj);db.flush()
    change(db,user,-bet,f"{game} wager reserved",obj)
    return obj

def finish_round(db:Session,user:User,round_obj:Round,payout:int,result:dict):
    if round_obj.status!="active":invalid("Round is already finished",409)
    change(db,user,payout,f"{round_obj.game} settlement",round_obj)
    round_obj.payout=payout
    round_obj.result=result
    round_obj.status="settled"
    round_obj.state={}
    xp_for(user,payout,round_obj.wager,round_obj.game)

def latest_active(db:Session,user:User,game:str)->Round|None:
    return db.scalar(select(Round).where(Round.user_id==user.id,Round.game==game,Round.status=="active").order_by(Round.id.desc()))

def play_instant(db:Session,user:User,game:str,bet:int,selection:str,value:int|None,key:str):
    if game not in GAMES:invalid("Unknown game")
    def run():
        # Compute bonus state AFTER locking the wallet row; never pre-read stale spins.
        if game=="slots":
            data=user.slots_state or {}
            free=max(0,min(100,int(data.get("remaining",0))))
            if free:
                stake=0
                effective_bet=int(data.get("bet",0))
                if not 100<=effective_bet<=MAX_AMOUNT:invalid("Invalid server bonus state",409)
            else:stake=bet;effective_bet=bet
        else:stake=bet;effective_bet=bet
        if stake:wager_check(user,stake)
        try:
            if game=="dice":out=logic.dice(effective_bet,selection)
            elif game=="roulette":out=logic.roulette(effective_bet,selection,value)
            elif game=="slots":out=logic.slots(effective_bet)
            else:out=logic.baccarat(effective_bet,selection)
        except (ValueError,TypeError) as exc:
            invalid(str(exc))
        payout=out["payout"]
        if not isinstance(payout,int) or payout<0 or payout>logic.MAX_BALANCE:invalid("Invalid payout",500)
        obj=begin_round(db,user,game,stake,{"instant":True})
        if game=="slots":
            remaining=free-1 if free else 0
            remaining+=out["free_spins_awarded"]
            if remaining>100:remaining=100
            user.slots_state={"remaining":remaining,"bet":effective_bet}
            out["bonus_remaining"]=remaining
            out["bonus_spin"]=bool(free)
        finish_round(db,user,obj,payout,out)
        return {"round_id":obj.id,"game":game,"wager":stake,
                "payout":payout,"net":payout-stake,"result":out}
    return execute(db,user,key,f"instant:{game}",{"bet":bet,"selection":selection,"value":value},run)

def poker_public(round_obj:Round)->dict:
    return {"round_id":round_obj.id,"hand":round_obj.state["hand"],"bet":round_obj.wager,
            "status":round_obj.status}

def poker_deal(db:Session,user:User,bet:int,key:str):
    def run():
        wager_check(user,bet)
        if latest_active(db,user,"Video Poker"):invalid("Finish or forfeit the existing Poker hand",409)
        deck=logic.shuffled_deck(poker=True)
        hand=[deck.pop() for _ in range(5)]
        round_obj=begin_round(db,user,"Video Poker",bet,{"hand":hand,"deck":deck})
        return {**poker_public(round_obj),"message":"Wager reserved at deal; leaving or forfeiting does not refund it."}
    return execute(db,user,key,"poker:deal",{"bet":bet},run)

def owned_round(db:Session,user:User,round_id:int,game:str)->Round:
    obj=db.scalar(select(Round).where(Round.id==round_id,Round.user_id==user.id,Round.game==game))
    if not obj:invalid("Round not found",404)
    return obj

def poker_draw(db:Session,user:User,round_id:int,hold:list[bool],key:str):
    if len(hold)!=5 or any(type(v) is not bool for v in hold):invalid("Hold exactly five booleans")
    def run():
        r=owned_round(db,user,round_id,"Video Poker")
        if r.status!="active":invalid("Round already completed",409)
        hand=r.state["hand"][:]
        deck=r.state["deck"][:]
        final=[c if hold[i] else deck.pop() for i,c in enumerate(hand)]
        category=logic.poker_class(final)
        payout=logic.POKER_PAYS[category]*r.wager
        result={"initial":hand,"hold":hold,"final":final,"category":category}
        finish_round(db,user,r,payout,result)
        return {"round_id":r.id,"game":"Video Poker","wager":r.wager,
                "payout":payout,"net":payout-r.wager,"result":result}
    return execute(db,user,key,"poker:draw",{"round_id":round_id,"hold":hold},run)

def poker_forfeit(db:Session,user:User,round_id:int,key:str):
    def run():
        r=owned_round(db,user,round_id,"Video Poker")
        if r.status!="active":invalid("Round already finished",409)
        finish_round(db,user,r,0,{"forfeit":True})
        return {"round_id":r.id,"wager":r.wager,"payout":0,"net":-r.wager,"forfeit":True}
    return execute(db,user,key,"poker:forfeit",{"round_id":round_id},run)

def bj_start(db:Session,user:User,bet:int,key:str):
    def run():
        wager_check(user,bet)
        if latest_active(db,user,"Blackjack"):invalid("An active Blackjack round must be completed first",409)
        shoe=logic.shuffled_deck(6)
        player=[shoe.pop(),shoe.pop()]
        dealer=[shoe.pop(),shoe.pop()]
        state={"shoe":shoe,"dealer":dealer,"hands":[{"cards":player,"bet":bet,"stood":False,"from_split":False}],
               "active":0,"insurance_pending":dealer[0]["r"]=="A","insurance_bet":0}
        r=begin_round(db,user,"Blackjack",bet,state)
        if not state["insurance_pending"] and (logic.blackjack_total(player)==21 or logic.blackjack_total(dealer)==21):
            bj_finalize(db,user,r,state)
        return {"round_id":r.id,"game":"Blackjack","table":bj_response(r,state)}
    return execute(db,user,key,"blackjack:start",{"bet":bet},run)

def bj_response(r:Round,state:dict)->dict:
    if r.status=="settled":
        return {**logic.bj_view({**state,"finished":True,"outcomes":r.result.get("outcomes",[])}),
                "round_id":r.id}
    return {**logic.bj_view(state),"round_id":r.id}

def bj_finalize(db:Session,user:User,r:Round,state:dict):
    hands=state["hands"];dealer=state["dealer"]
    if any(not h.get("surrendered") and logic.blackjack_total(h["cards"])<=21 for h in hands):
        while logic.blackjack_total(dealer)<17:
            dealer.append(state["shoe"].pop())
    dt=logic.blackjack_total(dealer)
    dealer_bj=len(dealer)==2 and dt==21
    outcomes=[];payout=0
    for h in hands:
        value=logic.blackjack_total(h["cards"])
        natural=len(h["cards"])==2 and value==21 and not h.get("from_split",False)
        if h.get("surrendered"):amount=h["bet"]//2;reason="Surrender"
        elif value>21:amount=0;reason="Bust"
        elif natural and not dealer_bj:amount=h["bet"]*5//2;reason="Blackjack"
        elif dealer_bj and natural:amount=h["bet"];reason="Push"
        elif dealer_bj:amount=0;reason="Dealer blackjack"
        elif dt>21 or value>dt:amount=h["bet"]*2;reason="Win"
        elif value==dt:amount=h["bet"];reason="Push"
        else:amount=0;reason="Dealer wins"
        payout+=amount
        outcomes.append({"hand":h["cards"],"bet":h["bet"],"payout":amount,"reason":reason})
    insurance=state.get("insurance_bet",0)
    if insurance and dealer_bj:payout+=insurance*3
    # The reserved wager and any supplemental split/double/insurance bets were already debited.
    r.wager=sum(h["bet"] for h in hands)+insurance
    result={"dealer":dealer,"outcomes":outcomes,"insurance_payout":insurance*3 if dealer_bj else 0}
    finish_round(db,user,r,payout,result)
    return result

def bj_action(db:Session,user:User,round_id:int,action:str,key:str):
    allowed={"hit","stand","double","split","surrender","insurance","decline"}
    if action not in allowed:invalid("Unknown Blackjack action")
    def run():
        r=owned_round(db,user,round_id,"Blackjack")
        if r.status!="active":invalid("Round already finished",409)
        state=json.loads(json.dumps(r.state))
        if state.get("insurance_pending"):
            if action not in ("insurance","decline"):invalid("Choose insurance or decline",409)
            if action=="insurance":
                cost=r.wager//2
                if cost>user.balance:invalid("Insufficient credits for insurance",409)
                change(db,user,-cost,"Blackjack insurance",r)
                state["insurance_bet"]=cost
            state["insurance_pending"]=False
            player=state["hands"][0]["cards"]
            if logic.blackjack_total(player)==21 or logic.blackjack_total(state["dealer"])==21:
                bj_finalize(db,user,r,state)
        else:
            if action in ("insurance","decline"):invalid("Insurance unavailable",409)
            i=state["active"]
            if i>=len(state["hands"]):invalid("No active hand",409)
            h=state["hands"][i]
            if h.get("stood"):invalid("Hand already complete",409)
            initial=len(h["cards"])==2
            if action=="hit":
                h["cards"].append(state["shoe"].pop())
                if logic.blackjack_total(h["cards"])>=21:h["stood"]=True
            elif action=="stand":h["stood"]=True
            elif action=="double":
                if not initial or h.get("doubled"):invalid("Cannot double after drawing",409)
                if user.balance<h["bet"]:invalid("Insufficient credits",409)
                change(db,user,-h["bet"],"Blackjack double",r)
                h["bet"]*=2;h["doubled"]=True;h["cards"].append(state["shoe"].pop());h["stood"]=True
            elif action=="split":
                cards=h["cards"]
                if len(state["hands"])!=1 or not initial or cards[0]["r"]!=cards[1]["r"]:
                    invalid("Split requires an initial matching pair",409)
                if user.balance<h["bet"]:invalid("Insufficient credits",409)
                change(db,user,-h["bet"],"Blackjack split",r)
                first,second=cards
                a={"cards":[first,state["shoe"].pop()],"bet":h["bet"],"stood":False,"from_split":True}
                b={"cards":[second,state["shoe"].pop()],"bet":h["bet"],"stood":False,"from_split":True}
                if first["r"]=="A":a["stood"]=b["stood"]=True
                state["hands"]=[a,b]
            elif action=="surrender":
                if not initial or len(state["hands"])!=1 or h.get("from_split"):
                    invalid("Surrender unavailable",409)
                h["surrendered"]=True;h["stood"]=True
            while state["active"]<len(state["hands"]) and state["hands"][state["active"]].get("stood"):
                state["active"]+=1
            if state["active"]==len(state["hands"]):
                bj_finalize(db,user,r,state)
        if r.status=="active":r.state=state
        return {"round_id":r.id,"game":"Blackjack","table":bj_response(r,state)}
    return execute(db,user,key,"blackjack:action",{"round_id":round_id,"action":action},run)

def bj_forfeit(db:Session,user:User,round_id:int,key:str):
    def run():
        r=owned_round(db,user,round_id,"Blackjack")
        if r.status!="active":invalid("Round already finished",409)
        state=r.state
        additional=state.get("insurance_bet",0)+sum(h["bet"] for h in state["hands"])
        r.wager=additional
        finish_round(db,user,r,0,{"forfeit":True,"outcomes":[],"dealer":state["dealer"]})
        return {"round_id":r.id,"forfeit":True,"wager":additional,"payout":0}
    return execute(db,user,key,"blackjack:forfeit",{"round_id":round_id},run)
