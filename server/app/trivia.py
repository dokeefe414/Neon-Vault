"""Authoritative Trivia streaks sourced from the existing 100+ question categories."""
import json
from pathlib import Path
from secrets import SystemRandom
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import User, Round
from .services import execute,latest_active,owned_round,change,xp_for

BANK_PATH=Path(__file__).with_name("trivia_bank.json")
BANK=None

def get_bank():
    global BANK
    if BANK is None:
        if not BANK_PATH.exists():
            raise HTTPException(503,"Trivia bank not generated. Run node scripts/export-trivia.mjs before starting the server.")
        BANK=json.loads(BANK_PATH.read_text(encoding="utf-8"))
        if not isinstance(BANK,list) or len(BANK)<600:
            raise RuntimeError("Invalid generated Trivia question bank")
    return BANK

def trivia_catalog():
    bank=get_bank()
    categories=["General"]+sorted({q["category"] for q in bank})
    return {"categories":{name:len(bank) if name=="General" else sum(q["category"]==name for q in bank)
                          for name in categories}}

def public_trivia(round_obj:Round):
    state=round_obj.state
    index=state["index"]
    if index>=len(state["questions"]):
        return {"round_id":round_obj.id,"finished":True,"pot":state["pot"]}
    entry=get_bank()[state["questions"][index]]
    return {"round_id":round_obj.id,"category":state["category"],
            "question":{"q":entry["q"],"a":entry["a"],"difficulty":entry["difficulty"]},
            "index":index+1,"total":10,"pot":state["pot"],"finished":False}

def start_trivia(db:Session,user:User,category:str,key:str):
    def run():
        bank=get_bank()
        cats=trivia_catalog()["categories"]
        if category not in cats:raise HTTPException(422,"Unknown trivia specialization")
        old=latest_active(db,user,"Trivia")
        if old:
            old.status="settled";old.state={}
            old.result={"abandoned":True}
        profile=dict(user.profile or {})
        histories=dict(profile.get("trivia_seen",{}))
        pool=[i for i,q in enumerate(bank) if category=="General" or q["category"]==category]
        seen=set(histories.get(category,[]))&set(pool)
        rng=SystemRandom()
        remaining=list(set(pool)-seen)
        rng.shuffle(remaining)
        selected=remaining[:10]
        if len(selected)<10:
            seen.clear()
            new=list(set(pool)-set(selected))
            rng.shuffle(new)
            selected+=new[:10-len(selected)]
        if len(selected)!=10 or len(set(selected))!=10:raise HTTPException(503,"Not enough unique questions")
        seen.update(selected)
        histories[category]=list(seen)
        profile["trivia_seen"]=histories;user.profile=profile
        round_obj=Round(user_id=user.id,game="Trivia",status="active",wager=0,
                        state={"category":category,"questions":selected,"index":0,"pot":0})
        db.add(round_obj);db.flush()
        return public_trivia(round_obj)
    return execute(db,user,key,"trivia:start",{"category":category},run)

def answer_trivia(db:Session,user:User,round_id:int,choice:int,key:str):
    if type(choice) is not int or not 0<=choice<=3:raise HTTPException(422,"Invalid choice")
    def run():
        round_obj=owned_round(db,user,round_id,"Trivia")
        if round_obj.status!="active":raise HTTPException(409,"Trivia streak already finished")
        state=dict(round_obj.state)
        question=get_bank()[state["questions"][state["index"]]]
        correct=choice==question["c"]
        explanation={"correct":correct,"correct_answer":question["a"][question["c"]]}
        if not correct:
            round_obj.status="settled";round_obj.state={}
            round_obj.result={"streak":state["index"],"lost_pot":state["pot"],"cashout":False}
            return {**explanation,"finished":True,"pot":0,"result":"incorrect"}
        index=state["index"]+1
        state["pot"]=1000 if index==1 else state["pot"]*2
        state["index"]=index
        if index==10:
            amount=state["pot"]
            change(db,user,amount,"Trivia full-streak reward",round_obj)
            xp_for(user,amount,0,"Trivia")
            round_obj.status="settled";round_obj.state={}
            round_obj.payout=amount
            round_obj.result={"streak":10,"cashout":True}
            return {**explanation,"finished":True,"pot":amount,"result":"completed"}
        round_obj.state=state
        return {**explanation,**public_trivia(round_obj)}
    return execute(db,user,key,"trivia:answer",{"round_id":round_id,"choice":choice},run)

def cashout_trivia(db:Session,user:User,round_id:int,key:str):
    def run():
        r=owned_round(db,user,round_id,"Trivia")
        if r.status!="active":raise HTTPException(409,"Trivia streak already completed")
        state=r.state
        if state["pot"]<=0:raise HTTPException(409,"No streak pot to collect")
        amount=state["pot"]
        change(db,user,amount,"Trivia cashout",r)
        xp_for(user,amount,0,"Trivia")
        r.status="settled";r.state={};r.payout=amount;r.result={"streak":state["index"],"cashout":True}
        return {"round_id":r.id,"wager":0,"payout":amount,"net":amount,"streak":state["index"]}
    return execute(db,user,key,"trivia:cashout",{"round_id":round_id},run)
