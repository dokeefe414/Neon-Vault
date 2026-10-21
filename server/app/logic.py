"""Pure, testable NEON VAULT cloud game rules. No browser-supplied outcomes."""
from __future__ import annotations

from collections import Counter
from secrets import randbelow
from typing import Any

MAX_BET = 1_000_000  # cents ($10,000)
MAX_BALANCE = 10**13
REDS = frozenset((1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36))
ROULETTE_OUTSIDE = frozenset(("red","black","odd","even","low","high"))
SYMBOLS = (("🍒",28,(0,0,2,5,12,30)),("🍋",24,(0,0,2,5,15,35)),
           ("🔔",18,(0,0,3,8,20,50)),("💎",12,(0,0,4,12,35,90)),
           ("7️⃣",8,(0,0,6,20,70,200)),("⭐",6,(0,0,5,15,50,125)),
           ("✨",4,(0,0,0,0,0,0)))
LINES = ((1,1,1,1,1),(0,0,0,0,0),(2,2,2,2,2),(0,1,2,1,0),
         (2,1,0,1,2),(0,0,1,2,2),(2,2,1,0,0))
RANKS = ("A","2","3","4","5","6","7","8","9","10","J","Q","K")
SUITS = ("♠","♥","♦","♣")
POKER_RANKS = ("2","3","4","5","6","7","8","9","10","J","Q","K","A")
# Total returns include original stake (NEON VAULT's custom, non-9/6 paytable).
POKER_PAYS = {"royal":800,"straightFlush":50,"four":25,"fullHouse":9,
              "flush":6,"straight":4,"three":3,"twoPair":2,"jacks":2,"none":0}


def card(r: str, suit: str) -> dict[str,str]:
    return {"r":r,"s":suit}


def shuffled_deck(decks: int = 1, poker: bool = False) -> list[dict[str,str]]:
    ranks = POKER_RANKS if poker else RANKS
    result = [card(r,s) for _ in range(decks) for s in SUITS for r in ranks]
    # Fisher-Yates using OS cryptographic randomness; not Mersenne Twister.
    for i in range(len(result)-1, 0, -1):
        j = randbelow(i+1)
        result[i],result[j] = result[j],result[i]
    return result


def roulette(bet: int, pick: str, value: int | None = None, *, number: int | None = None) -> dict[str,Any]:
    if not (pick in ROULETTE_OUTSIDE or pick in ("dozen1","dozen2","dozen3",
            "column1","column2","column3","number")):
        raise ValueError("Invalid roulette selection")
    if pick=="number" and (type(value) is not int or not 0<=value<=36):
        raise ValueError("Number bets require a value from 0 to 36")
    n = randbelow(37) if number is None else number
    if type(n) is not int or not 0<=n<=36:
        raise ValueError("Invalid wheel result")
    color = "green" if n==0 else "red" if n in REDS else "black"
    win = False
    multiple = 0
    if pick=="number":
        win,multiple=n==value,36
    elif n:
        if pick in ("red","black"):
            win=color==pick
        elif pick in ("odd","even"):
            win=(n%2==1)==(pick=="odd")
        elif pick=="low":
            win=n<=18
        elif pick=="high":
            win=n>=19
        elif pick.startswith("dozen"):
            block=int(pick[-1]);win=(block-1)*12<n<=block*12
        elif pick.startswith("column"):
            win=((n-1)%3)+1==int(pick[-1])
        multiple=3 if pick.startswith(("dozen","column")) else 2
    return {"number":n,"color":color,"selection":pick,"value":value,
            "win":win,"payout":bet*multiple if win else 0}


def dice(bet: int, choice: str, *, roll: tuple[int,int] | None = None) -> dict[str,Any]:
    if choice not in ("high","low"):
        raise ValueError("Choose high or low")
    a,b = roll if roll is not None else (randbelow(6)+1,randbelow(6)+1)
    if not (1<=a<=6 and 1<=b<=6):
        raise ValueError("Invalid dice")
    n=a+b
    win=(n>=8 if choice=="high" else n<=6)
    return {"die1":a,"die2":b,"sum":n,"choice":choice,"win":win,"payout":2*bet if win else 0}


def slots(bet: int, *, grid: list[list[str]] | None = None) -> dict[str,Any]:
    if grid is None:
        symbols = [v for v,_,_ in SYMBOLS]
        weights = [w for _,w,_ in SYMBOLS]
        total=sum(weights)
        def spin_symbol() -> str:
            x=randbelow(total)
            for sym,weight in zip(symbols,weights):
                if x<weight:return sym
                x-=weight
            return symbols[-1]
        grid=[[spin_symbol() for _ in range(5)] for _ in range(3)]
    if len(grid)!=3 or any(len(row)!=5 for row in grid):
        raise ValueError("Slots must have 3 rows and 5 reels")
    paymap={v:p for v,_,p in SYMBOLS}
    if any(s not in paymap for row in grid for s in row):
        raise ValueError("Invalid slot symbol")
    wins=[]
    for index,line in enumerate(LINES):
        values=[grid[row][col] for col,row in enumerate(line)]
        target=None;count=0
        for sym in values:
            if sym=="✨":break
            if sym=="⭐":count+=1;continue
            if target is None or target==sym:
                target=sym;count+=1
            else:break
        if target is None and count:target="⭐"
        if count>=3 and target:
            amount=(bet*paymap[target][count])//len(LINES)
            if amount:wins.append({"line":index+1,"count":count,"symbol":target,"payout":amount})
    scatters=sum(sym=="✨" for row in grid for sym in row)
    return {"grid":grid,"wins":wins,"scatters":scatters,"free_spins_awarded":3 if scatters>=3 else 0,
            "payout":sum(x["payout"] for x in wins)}


def baccarat_total(hand: list[dict]) -> int:
    return sum(1 if c["r"]=="A" else 0 if c["r"] in ("10","J","Q","K")
               else int(c["r"]) for c in hand)%10


def banker_draws(total: int, third: int | None) -> bool:
    if third is None:return total<=5
    if total<=2:return True
    if total==3:return third!=8
    if total==4:return 2<=third<=7
    if total==5:return 4<=third<=7
    if total==6:return third in (6,7)
    return False


def baccarat(bet: int, choice: str, *, shoe: list[dict] | None = None) -> dict[str,Any]:
    if choice not in ("banker","player","tie"):raise ValueError("Invalid Baccarat bet")
    shoe=shoe if shoe is not None else shuffled_deck(8)
    if len(shoe)<6:raise ValueError("Baccarat shoe too small")
    player=[shoe.pop(),shoe.pop()];banker=[shoe.pop(),shoe.pop()]
    p,b=baccarat_total(player),baccarat_total(banker)
    natural=p>=8 or b>=8
    if not natural:
        third=None
        if p<=5:
            c=shoe.pop();player.append(c)
            third=1 if c["r"]=="A" else 0 if c["r"] in ("10","J","Q","K") else int(c["r"])
        if banker_draws(b,third):banker.append(shoe.pop())
    p,b=baccarat_total(player),baccarat_total(banker)
    winner="tie" if p==b else "player" if p>b else "banker"
    if winner=="tie":
        payout=9*bet if choice=="tie" else bet
    elif choice!=winner:payout=0
    else:payout=(195*bet)//100 if choice=="banker" else 2*bet
    return {"player":player,"banker":banker,"player_total":p,"banker_total":b,
            "winner":winner,"natural":natural,"selection":choice,"payout":payout}


def poker_class(hand: list[dict]) -> str:
    if len(hand)!=5 or len({(c["r"],c["s"]) for c in hand})!=5:
        raise ValueError("Invalid/duplicate poker cards")
    nums=sorted(POKER_RANKS.index(c["r"])+2 for c in hand)
    counts=Counter(nums);freq=sorted(counts.values(),reverse=True)
    straight=(len(counts)==5 and (nums[-1]-nums[0]==4 or nums==[2,3,4,5,14]))
    flush=len({c["s"] for c in hand})==1
    if flush and nums==[10,11,12,13,14]:return "royal"
    if flush and straight:return "straightFlush"
    if freq[0]==4:return "four"
    if freq==[3,2]:return "fullHouse"
    if flush:return "flush"
    if straight:return "straight"
    if freq[0]==3:return "three"
    if freq==[2,2,1]:return "twoPair"
    if freq[0]==2 and any(n>=11 and v==2 for n,v in counts.items()):return "jacks"
    return "none"


def blackjack_total(cards: list[dict]) -> int:
    n=sum(11 if c["r"]=="A" else 10 if c["r"] in ("10","J","Q","K")
          else int(c["r"]) for c in cards)
    aces=sum(c["r"]=="A" for c in cards)
    while n>21 and aces:n-=10;aces-=1
    return n


def bj_view(state: dict) -> dict[str,Any]:
    finished=state.get("finished",False)
    hands=[{"cards":h["cards"],"bet":h["bet"],"total":blackjack_total(h["cards"]),
            "stood":h.get("stood",False),"bust":blackjack_total(h["cards"])>21,
            "from_split":h.get("from_split",False)} for h in state["hands"]]
    active=state["active"]
    hand=hands[active] if active<len(hands) else None
    can_split=bool(hand and len(hands)==1 and len(hand["cards"])==2 and
             hand["cards"][0]["r"]==hand["cards"][1]["r"] and not hand["stood"])
    actions=[]
    if not finished:
        if state.get("insurance_pending"):actions=["insurance","decline"]
        elif hand:
            actions=["hit","stand"]
            if len(hand["cards"])==2 and not hand["stood"]:
                actions+=["double"]
                if can_split:actions+=["split"]
                if not hand["from_split"] and len(hands)==1:actions+=["surrender"]
    return {"dealer":state["dealer"] if finished else state["dealer"][:1],
            "dealer_hidden":not finished,"hands":hands,"active":active,
            "available_actions":actions,"finished":finished,
            "outcomes":state.get("outcomes",[]),"insurance_pending":bool(state.get("insurance_pending",False))}
