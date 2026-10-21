"""Deterministic maths, privacy and server-only outcomes."""
import pytest
from app import logic

def c(r,s="♠"):return {"r":r,"s":s}
def test_roulette_complete_probability_table():
    for pick in ("red","black","odd","even","low","high"):
        assert sum(logic.roulette(100,pick,number=n)["payout"]==200 for n in range(37))==18
    for pick in ("dozen1","dozen2","dozen3","column1","column2","column3"):
        assert sum(logic.roulette(100,pick,number=n)["payout"]==300 for n in range(37))==12
    for chosen in range(37):
        assert sum(logic.roulette(100,"number",chosen,number=n)["payout"]==3600 for n in range(37))==1
    assert logic.roulette(100,"red",number=0)["payout"]==0
    with pytest.raises(ValueError):logic.roulette(100,"free money",number=1)

def test_dice_exhaustive_rules():
    for choice in ("high","low"):
        wins=0
        for a in range(1,7):
            for b in range(1,7):
                r=logic.dice(100,choice,roll=(a,b))
                if r["win"]:wins+=1
        assert wins==15
    with pytest.raises(ValueError):logic.dice(100,"seven")

def test_baccarat_banker_rules():
    assert logic.baccarat_total([c("A"),c("8")])==9
    assert logic.baccarat_total([c("9"),c("7")])==6
    for third in range(10):
        assert logic.banker_draws(2,third) is True
        assert logic.banker_draws(7,third) is False
    assert logic.banker_draws(3,8) is False
    assert logic.banker_draws(5,4) is True
    assert logic.banker_draws(6,6) is True
    assert logic.banker_draws(6,5) is False

def test_slots_symbol_validation_and_no_bonus_on_empty():
    grid=[["🍋"]*5 for _ in range(3)]
    r=logic.slots(700,grid=grid)
    assert r["payout"]>0 and r["free_spins_awarded"]==0
    grid[0][0]=grid[0][1]=grid[0][2]="✨"
    assert logic.slots(700,grid=grid)["free_spins_awarded"]==3
    grid[0][0]="UNTRUSTED"
    with pytest.raises(ValueError):logic.slots(700,grid=grid)

def test_poker_all_classes_and_ace_low_straight():
    samples={
      "royal":[c(r) for r in ("10","J","Q","K","A")],
      "straightFlush":[c(r) for r in ("5","6","7","8","9")],
      "four":[c("A",s) for s in ("♠","♥","♦","♣")]+[c("2")],
      "fullHouse":[c("K",s) for s in ("♠","♥","♦")]+[c("2","♣"),c("2","♠")],
      "flush":[c(r) for r in ("2","5","7","J","A")],
      "straight":[c("A","♠"),c("2","♥"),c("3","♣"),c("4","♦"),c("5","♠")],
      "three":[c("7","♠"),c("7","♥"),c("7","♦"),c("K","♣"),c("3","♠")],
      "twoPair":[c("5","♠"),c("5","♥"),c("Q","♦"),c("Q","♣"),c("A","♠")],
      "jacks":[c("J","♠"),c("J","♥"),c("3","♦"),c("4","♣"),c("8","♠")],
      "none":[c("9","♠"),c("9","♥"),c("3","♦"),c("4","♣"),c("8","♠")]
    }
    for group,hand in samples.items():
        assert logic.poker_class(hand)==group,group
        assert logic.POKER_PAYS[group]>=0
    assert logic.POKER_PAYS["jacks"]==2
    with pytest.raises(ValueError):logic.poker_class([c("A")]*5)

def test_blackjack_soft_ace_totals_and_views():
    assert logic.blackjack_total([c("A"),c("A"),c("9")])==21
    assert logic.blackjack_total([c("A"),c("9"),c("9")])==19
    state={"dealer":[c("A"),c("Q")],"hands":[{"cards":[c("8"),c("8")],"bet":500,"stood":False}],
          "active":0,"insurance_pending":False}
    result=logic.bj_view(state)
    assert result["dealer_hidden"] and len(result["dealer"])==1
    assert "split" in result["available_actions"]
    assert "insurance" not in result["available_actions"]
    assert result["hands"][0]["total"]==16
