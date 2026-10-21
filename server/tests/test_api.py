"""Integration coverage: authorization, ledger safety, all 7 games and verified rewards."""
import uuid
from app.db import SessionLocal,User,Round
from app.trivia import get_bank
from app import logic
from sqlalchemy import select

def key():return str(uuid.uuid4())
def signup(c,name="playerone",password="a-long-passphrase-2026"):
    r=c.post("/api/v1/auth/register",json={"username":name,"password":password})
    assert r.status_code==201,r.text
    return {"Authorization":"Bearer "+r.json()["token"]}
def post(c,url,payload,headers):
    return c.post("/api/v1"+url,json={"key":key(),**payload},headers=headers)
def wallet(c,headers):
    r=c.get("/api/v1/wallet",headers=headers)
    assert r.status_code==200,r.text
    return r.json()["balance"]

def test_health_and_no_secret_leaks(client):
    assert client.get("/healthz").json()["status"]=="ok"
    assert client.get("/api/v1/wallet").status_code==401
    r=client.options("/api/v1/me",headers={"Origin":"https://evil.example","Access-Control-Request-Method":"GET"})
    assert "access-control-allow-origin" not in r.headers
    r=client.get("/healthz")
    assert r.headers["cache-control"]=="no-store"
    assert r.headers["x-content-type-options"]=="nosniff"

def test_registration_auth_session_revoke_and_profile_restrictions(client):
    h=signup(client)
    assert wallet(client,h)==100000
    assert client.post("/api/v1/auth/register",json={"username":"playerone","password":"different-pass-2026"}).status_code==409
    assert client.post("/api/v1/auth/login",json={"username":"playerone","password":"bad-password-1234"}).status_code==401
    assert client.post("/api/v1/auth/register",json={"username":"bad!","password":"short"}).status_code==422
    login=client.post("/api/v1/auth/login",json={"username":"playerone","password":"a-long-passphrase-2026"})
    assert login.status_code==200
    updated=client.patch("/api/v1/me",json={"display_name":"Vault Hero","avatar":"💎","theme":"purple"},headers=h)
    assert updated.status_code==200 and updated.json()["display_name"]=="Vault Hero"
    assert client.patch("/api/v1/me",json={"display_name":"Bad","avatar":"◆","theme":"mint","balance":99999999},headers=h).status_code==422
    assert client.post("/api/v1/auth/logout",headers=h).status_code==200
    assert client.get("/api/v1/me",headers=h).status_code==401
    assert client.get("/api/v1/me",headers={"Authorization":"Bearer "+login.json()["token"]}).status_code==200

def test_dice_and_idempotent_single_credit(client):
    h=signup(client)
    payload={"key":key(),"game":"dice","bet":500,"selection":"high"}
    first=client.post("/api/v1/games/play",json=payload,headers=h)
    assert first.status_code==200,first.text
    one=first.json()
    assert one["wager"]==500 and one["payout"] in (0,1000)
    assert one["balance"]==100000+one["net"]
    second=client.post("/api/v1/games/play",json=payload,headers=h)
    assert second.status_code==200 and second.json()==one
    assert wallet(client,h)==one["balance"]
    assert client.post("/api/v1/games/play",json={**payload,"bet":1000},headers=h).status_code==409
    assert client.post("/api/v1/games/play",json={"key":key(),"game":"dice","bet":700,"selection":"high"},headers=h).status_code==422
    assert len(client.get("/api/v1/history",headers=h).json()["rounds"])==1

def test_roulette_validation_and_other_games(client):
    h=signup(client)
    invalid=post(client,"/games/play",{"game":"roulette","selection":"number","value":99,"bet":500},h)
    assert invalid.status_code==422
    for game,selection in (("roulette","red"),("baccarat","banker"),("slots","")):
        r=post(client,"/games/play",{"game":game,"bet":500,"selection":selection},h)
        assert r.status_code==200,(game,r.text)
        assert r.json()["wager"]==500
        assert r.json()["result"]["payout"]==r.json()["payout"]
    assert len(client.get("/api/v1/history",headers=h).json()["rounds"])==3
    h2=signup(client,"seconduser")
    assert client.get("/api/v1/history",headers=h2).json()["rounds"]==[]
    assert wallet(client,h2)==100000

def test_poker_reserve_draw_once_reload_and_cross_account(client):
    h=signup(client)
    dealt=post(client,"/poker/deal",{"bet":600},h)
    assert dealt.status_code==200,dealt.text
    obj=dealt.json()
    assert wallet(client,h)==99400
    assert len(obj["hand"])==5 and "deck" not in obj
    assert len(client.get("/api/v1/rounds/active",headers=h).json()["rounds"])==1
    assert post(client,"/poker/deal",{"bet":100},h).status_code==409
    h2=signup(client,"anotherplayer")
    assert post(client,"/poker/draw",{"round_id":obj["round_id"],"hold":[True]*5},h2).status_code==404
    payload={"key":key(),"round_id":obj["round_id"],"hold":[True]*5}
    result=client.post("/api/v1/poker/draw",json=payload,headers=h)
    assert result.status_code==200,result.text
    assert result.json()["wager"]==600
    assert wallet(client,h)==result.json()["balance"]
    again=client.post("/api/v1/poker/draw",json=payload,headers=h)
    assert again.status_code==200 and again.json()==result.json()
    assert post(client,"/poker/draw",{"round_id":obj["round_id"],"hold":[True]*5},h).status_code==409
    assert client.get("/api/v1/rounds/active",headers=h).json()["rounds"]==[]

def test_poker_forfeit_no_free_card_selection(client):
    h=signup(client)
    dealt=post(client,"/poker/deal",{"bet":1000},h).json()
    result=post(client,"/poker/forfeit",{"round_id":dealt["round_id"]},h)
    assert result.status_code==200 and result.json()["payout"]==0
    assert wallet(client,h)==99000

def test_blackjack_hidden_dealer_and_server_actions(client):
    h=signup(client)
    r=post(client,"/blackjack/start",{"bet":500},h)
    assert r.status_code==200,r.text
    item=r.json()
    assert item["table"]["dealer_hidden"] is True or item["table"]["finished"]
    if not item["table"]["finished"]:
        assert len(item["table"]["dealer"])==1
        assert "shoe" not in str(item)
        while item["table"]["insurance_pending"]:
            item=post(client,"/blackjack/action",{"round_id":item["round_id"],"action":"decline"},h).json()
        if not item["table"]["finished"]:
            response=post(client,"/blackjack/action",{"round_id":item["round_id"],"action":"stand"},h)
            assert response.status_code==200,response.text
            item=response.json()
        assert item["table"]["finished"]
    rounds=client.get("/api/v1/history",headers=h).json()["rounds"]
    assert len(rounds)==1 and rounds[0]["game"]=="Blackjack"
    assert rounds[0]["wager"]==500
    assert wallet(client,h)==100000-500+rounds[0]["payout"]

def test_blackjack_invalid_action_does_not_debit(client):
    h=signup(client)
    r=post(client,"/blackjack/start",{"bet":300},h).json()
    if not r["table"]["finished"]:
        before=wallet(client,h)
        bad=post(client,"/blackjack/action",{"round_id":r["round_id"],"action":"cheat"},h)
        assert bad.status_code==422 and wallet(client,h)==before

def test_trivia_bank_and_verified_answer_cashout(client):
    h=signup(client)
    cat=client.get("/api/v1/trivia/catalog").json()["categories"]
    assert len(cat)>=7
    assert all(n>=100 for name,n in cat.items() if name!="General")
    r=post(client,"/trivia/start",{"category":"Technology"},h)
    assert r.status_code==200,r.text
    entry=r.json()
    assert "c" not in entry["question"]
    assert "correct" not in entry["question"]
    with SessionLocal() as db:
        row=db.get(Round,entry["round_id"])
        correct=get_bank()[row.state["questions"][0]]["c"]
    before=wallet(client,h)
    answer=post(client,"/trivia/answer",{"round_id":entry["round_id"],"choice":correct},h)
    assert answer.status_code==200,answer.text
    assert answer.json()["pot"]==1000 and wallet(client,h)==before
    claimed=post(client,"/trivia/cashout",{"round_id":entry["round_id"]},h)
    assert claimed.status_code==200,claimed.text
    assert wallet(client,h)==before+1000
    assert post(client,"/trivia/cashout",{"round_id":entry["round_id"]},h).status_code==409

def test_rewards_cloud_verified_xp_and_shop(client):
    h=signup(client)
    r=post(client,"/rewards/daily",{},h)
    assert r.status_code==200,r.text
    assert r.json()["style_tokens"]==2
    assert post(client,"/rewards/daily",{},h).status_code==409
    assert post(client,"/rewards/prestige/gold",{},h).status_code==409
    with SessionLocal() as db:
        u=db.scalar(select(User).where(User.username=="playerone"))
        u.xp=12000;u.style_tokens=30;db.commit()
    claimed=post(client,"/rewards/prestige/gold",{},h)
    assert claimed.status_code==200,claimed.text
    assert post(client,"/rewards/prestige/gold",{},h).status_code==409
    bought=post(client,"/rewards/buy",{"item":"card-aurora"},h)
    assert bought.status_code==200,bought.text
    equipped=post(client,"/rewards/equip",{"slot":"card_back","item":"aurora"},h)
    assert equipped.status_code==200,equipped.text
    assert client.get("/api/v1/me",headers=h).json()["cosmetics"]["card_back"]=="aurora"
    assert post(client,"/rewards/equip",{"slot":"felt","item":"sapphire"},h).status_code==403

def test_verified_leaderboard_and_no_balance_import(client):
    h=signup(client,"firstplayer")
    h2=signup(client,"secondplayer")
    for _ in range(3):
        assert post(client,"/games/play",{"game":"dice","bet":100,"selection":"low"},h).status_code==200
    leaders=client.get("/api/v1/leaderboard").json()["players"]
    assert leaders[0]["username"]=="firstplayer"
    assert "balance" not in str(leaders)
    assert client.patch("/api/v1/me",headers=h2,json={"display_name":"cheater","avatar":"◆","theme":"mint","xp":999999}).status_code==422
