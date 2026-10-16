import {$,money} from '../core/utils.js';
import {shuffle} from '../core/random.js';
import {getState,debit,settle} from '../core/store.js';
import {parseMainBet,parseSideBet,renderWallet,toast,wireBetButtons} from '../ui/common.js';
import {signal} from '../progression/progression.js';

const ACTIVE_KEY='neon-vault-blackjack-round-v1';
const suits=['♠','♥','♦','♣'];
const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const makeShoe=()=>shuffle(Array.from({length:6},()=>suits.flatMap(s=>ranks.map(r=>({s,r})))).flat());
const pairColor=s=>'♥♦'.includes(s)?'red':'black';
const cardValue=c=>c.r==='A'?14:{J:11,Q:12,K:13}[c.r]||Number(c.r);

export function handTotal(cards){
  let value=cards.reduce((sum,c)=>sum+(c.r==='A'?11:['J','Q','K'].includes(c.r)?10:Number(c.r)),0);
  let aces=cards.filter(c=>c.r==='A').length;
  while(value>21&&aces-->0)value-=10;
  return value;
}

function cardsHtml(cards){return cards.map(c=>`<span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${c.r}${c.s}</span>`).join('');}
function straight(values){const unique=[...new Set(values)].sort((a,b)=>a-b);return unique.length===3&&(unique[2]-unique[0]===2||JSON.stringify(unique)===JSON.stringify([2,3,14]));}
function perfectPairs(cards,bet){const[a,b]=cards;if(a.r!==b.r)return{payout:0,label:'Perfect Pairs: no pair'};if(a.s===b.s)return{payout:bet*26,label:'Perfect Pairs: PERFECT PAIR (25:1)'};if(pairColor(a.s)===pairColor(b.s))return{payout:bet*13,label:'Perfect Pairs: COLORED PAIR (12:1)'};return{payout:bet*7,label:'Perfect Pairs: MIXED PAIR (6:1)'};}
function plusThree(player,dealerUp,bet){
  const cards=[player[0],player[1],dealerUp],values=cards.map(cardValue),sameSuit=cards.every(c=>c.s===cards[0].s),counts=Object.values(values.reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{})),trips=counts.includes(3),isStraight=straight(values);
  let odds=0,name='no poker hand';
  if(trips&&sameSuit){odds=100;name='SUITED TRIPS';}else if(isStraight&&sameSuit){odds=40;name='STRAIGHT FLUSH';}else if(trips){odds=30;name='THREE OF A KIND';}else if(isStraight){odds=10;name='STRAIGHT';}else if(sameSuit){odds=5;name='FLUSH';}
  return{payout:odds?bet*(odds+1):0,label:`21+3: ${name}${odds?` (${odds}:1)`:''}`};
}

function loadRound(){
  try{
    const round=JSON.parse(localStorage.getItem(ACTIVE_KEY));
    if(round&&!round.settled&&Array.isArray(round.shoe)&&Array.isArray(round.dealer)&&Array.isArray(round.hands)&&round.hands.length&&Number.isSafeInteger(round.activeHand))return round;
  }catch{}
  localStorage.removeItem(ACTIVE_KEY);
  return null;
}

export class BlackjackGame{
  constructor(){this.round=loadRound();}
  persistRound(){
    if(this.round&&!this.round.settled)localStorage.setItem(ACTIVE_KEY,JSON.stringify(this.round));
    else localStorage.removeItem(ACTIVE_KEY);
  }
  clearRound(){localStorage.removeItem(ACTIVE_KEY);}
  hasActiveRound(){return!!this.round&&!this.round.settled;}
  render(){
    renderWallet();
    $('content').innerHTML=`<div class="game-panel"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">Blackjack</h2><p>Blackjack pays 3:2. Dealer stands on 17. Split, Double Down, Insurance, Surrender, Perfect Pairs, and 21+3 are supported.</p><div class="blackjack-rules"><span class="rule-chip">Dealer stands on 17</span><span class="rule-chip">Blackjack 3:2</span><span class="rule-chip">1 split max</span><span class="rule-chip">Split aces: 1 card</span><span class="rule-chip">Insurance 2:1</span><span class="rule-chip">Late surrender</span><span class="rule-chip">Round restore</span></div><div class="controls"><label for="bet">Main wager ($)</label><input id="bet" type="number" min="1" max="10000" step="1" value="25"><button class="secondary" data-bet-adjust="half">½ BET</button><button class="secondary" data-bet-adjust="double">2× BET</button><button class="primary" id="play">DEAL</button></div><div class="controls" style="margin-top:-5px"><label for="pairBet">Perfect Pairs ($)</label><input id="pairBet" type="number" min="0" max="10000" step="1" value="0"><label for="pokerBet">21+3 ($)</label><input id="pokerBet" type="number" min="0" max="10000" step="1" value="0"></div><p class="hint">Perfect Pairs: mixed 6:1 · colored 12:1 · perfect 25:1. 21+3: flush 5:1 · straight 10:1 · trips 30:1 · straight flush 40:1 · suited trips 100:1.</p><div id="table" class="felt"><div class="hint">Your cards will appear here.</div></div><div id="message" class="result"></div><div id="sideMessage" class="hint"></div><div id="actions" class="controls"></div></div>`;
    wireBetButtons();
    $('play').onclick=()=>this.start();
    if(this.round){
      $('message').textContent='Restored active hand';
      this.renderRound(false);
      if(this.round.dealer[0].r==='A'&&!this.round.insuranceResolved)this.offerInsurance();else this.renderActions();
    }
  }
  currentHand(){return this.round?.hands?.[this.round.activeHand]||null;}
  renderRound(reveal=false){
    const r=this.round;if(!r)return;
    const dealer=reveal?cardsHtml(r.dealer):cardsHtml(r.dealer.slice(0,1))+'<span class="playing-card back">◆</span>';
    $('table').innerHTML=`<div class="hint">DEALER · ${reveal?handTotal(r.dealer):'?'}</div><div class="hand">${dealer}</div><div style="display:grid;grid-template-columns:${r.hands.length>1?'repeat(2,minmax(0,1fr))':'1fr'};gap:16px;margin-top:18px">${r.hands.map((hand,i)=>{const total=handTotal(hand.cards),active=!r.settled&&i===r.activeHand;return`<div class="blackjack-hand ${active?'active':''}"><div class="hint">${r.hands.length>1?`HAND ${i+1}`:'YOU'} · ${total} · WAGER ${money(hand.bet)}${active?' · ACTIVE':''}</div><div class="hand">${cardsHtml(hand.cards)}</div>${total>21?'<div class="hint">BUST</div>':hand.stood?`<div class="hint">${hand.doubled?'DOUBLE DOWN · ':''}STOOD</div>`:''}</div>`;}).join('')}</div>`;
  }
  start(){
    if(this.hasActiveRound()){toast('Finish the current hand first','loss');return;}
    const bet=parseMainBet();if(bet===null)return;
    const pairBet=parseSideBet('pairBet','Perfect Pairs'),pokerBet=parseSideBet('pokerBet','21+3');if(pairBet===null||pokerBet===null)return;
    const totalStake=bet+pairBet+pokerBet;if(totalStake>getState().balance){toast(`You need ${money(totalStake)} for the main wager plus side bets`,'loss');return;}
    debit(totalStake,'Blackjack wagers');
    const shoe=makeShoe(),player=[shoe.pop(),shoe.pop()],dealer=[shoe.pop(),shoe.pop()];
    this.round={shoe,dealer,hands:[{cards:player,bet,stood:false,doubled:false,fromSplit:false}],activeHand:0,settled:false,hasSplit:false,actionTaken:false,insuranceBet:0,insuranceResolved:false};
    this.persistRound();
    $('message').textContent='';
    const notes=[];
    if(pairBet){const result=perfectPairs(player,pairBet);settle('Blackjack · Perfect Pairs',pairBet,result.payout,{quiet:true});notes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);}
    if(pokerBet){const result=plusThree(player,dealer[0],pokerBet);settle('Blackjack · 21+3',pokerBet,result.payout,{quiet:true});notes.push(`${result.label}${result.payout?` — ${money(result.payout)} returned`:''}`);}
    $('sideMessage').textContent=notes.join(' · ');this.renderRound(false);
    if(dealer[0].r==='A'){this.offerInsurance();return;}if(handTotal(player)===21||handTotal(dealer)===21){this.finish();return;}this.renderActions();
  }
  renderActions(){
    const r=this.round,hand=this.currentHand();if(!r||r.settled||!hand)return;
    const total=handTotal(hand.cards);if(total>=21){hand.stood=true;this.persistRound();this.advance();return;}
    const canDouble=hand.cards.length===2&&getState().balance>=hand.bet,canSplit=r.hands.length===1&&hand.cards.length===2&&hand.cards[0].r===hand.cards[1].r&&getState().balance>=hand.bet,canSurrender=hand.cards.length===2&&!hand.fromSplit&&!hand.doubled&&r.hands.length===1&&!r.actionTaken;
    $('actions').innerHTML=`<button class="primary" id="hit">HIT</button><button class="secondary" id="stand">STAND</button>${canDouble?'<button class="secondary" id="doubleDown">DOUBLE DOWN</button>':''}${canSplit?'<button class="secondary" id="splitHand">SPLIT</button>':''}${canSurrender?'<button class="secondary danger" id="surrender">SURRENDER</button>':''}`;
    $('hit').onclick=()=>{r.actionTaken=true;hand.cards.push(r.shoe.pop());if(handTotal(hand.cards)>=21)hand.stood=true;this.persistRound();this.renderRound(false);if(hand.stood)this.advance();else this.renderActions();};
    $('stand').onclick=()=>{r.actionTaken=true;hand.stood=true;this.persistRound();this.advance();};
    if(canDouble)$('doubleDown').onclick=()=>this.doubleDown();if(canSplit)$('splitHand').onclick=()=>this.split();if(canSurrender)$('surrender').onclick=()=>this.surrender();
  }
  offerInsurance(){
    const r=this.round;if(!r)return;const cost=Math.floor(r.hands[0].bet/2),afford=getState().balance>=cost;
    $('actions').innerHTML=`<div class="insurance-callout"><strong>Dealer shows an Ace.</strong> Insurance costs ${money(cost)} and pays 2:1 if the dealer has Blackjack.</div><button class="secondary" id="declineInsurance">NO INSURANCE</button>${afford?'<button class="primary" id="takeInsurance">TAKE INSURANCE</button>':''}`;
    $('declineInsurance').onclick=()=>this.resolveInsurance(false,cost);if(afford)$('takeInsurance').onclick=()=>this.resolveInsurance(true,cost);
  }
  resolveInsurance(take,cost){
    const r=this.round;if(!r)return;
    if(take){debit(cost,'Blackjack insurance');r.insuranceBet=cost;this.persistRound();}
    const dealerNatural=handTotal(r.dealer)===21&&r.dealer.length===2;
    if(r.insuranceBet){const payout=dealerNatural?r.insuranceBet*3:0;settle('Blackjack · Insurance',r.insuranceBet,payout,{quiet:true});$('sideMessage').textContent=[$('sideMessage').textContent,`Insurance ${dealerNatural?`wins — ${money(payout)} returned`:'loses'}`].filter(Boolean).join(' · ');}
    r.insuranceResolved=true;this.persistRound();if(dealerNatural||handTotal(r.hands[0].cards)===21)this.finish();else this.renderActions();
  }
  doubleDown(){
    const r=this.round,hand=this.currentHand();if(!r||!hand||hand.cards.length!==2||getState().balance<hand.bet)return;
    r.actionTaken=true;debit(hand.bet,'Blackjack double down');hand.bet*=2;hand.doubled=true;hand.cards.push(r.shoe.pop());hand.stood=true;this.persistRound();this.renderRound(false);this.advance();
  }
  split(){
    const r=this.round,hand=this.currentHand();if(!r||!hand||r.hands.length!==1||hand.cards.length!==2||hand.cards[0].r!==hand.cards[1].r||getState().balance<hand.bet)return;
    r.actionTaken=true;debit(hand.bet,'Blackjack split');const[first,second]=hand.cards,aces=first.r==='A';r.hasSplit=true;r.hands=[{cards:[first,r.shoe.pop()],bet:hand.bet,stood:aces,doubled:false,fromSplit:true},{cards:[second,r.shoe.pop()],bet:hand.bet,stood:aces,doubled:false,fromSplit:true}];r.activeHand=0;this.persistRound();this.renderRound(false);if(aces){toast('Split aces receive one card each');this.finish();}else this.renderActions();
  }
  surrender(){
    const r=this.round,hand=this.currentHand();if(!r||!hand||r.actionTaken)return;
    r.actionTaken=true;const refund=Math.floor(hand.bet/2);this.renderRound(true);$('message').textContent=`Surrender — ${money(refund)} returned`;settle('Blackjack',hand.bet,refund,{quiet:true,metadata:{surrender:true}});toast(`Blackjack: -${money(hand.bet-refund)} net`,'loss');r.settled=true;this.round=null;this.clearRound();$('actions').innerHTML='';renderWallet();
  }
  advance(){
    const r=this.round;if(!r)return;let next=r.activeHand+1;while(next<r.hands.length&&(r.hands[next].stood||handTotal(r.hands[next].cards)>=21)){r.hands[next].stood=true;next++;}
    if(next<r.hands.length){r.activeHand=next;this.persistRound();this.renderRound(false);this.renderActions();}else this.finish();
  }
  settleHand(hand,dealerTotal,dealerNatural){
    const playerTotal=handTotal(hand.cards),playerNatural=!hand.fromSplit&&hand.cards.length===2&&playerTotal===21;if(playerTotal>21)return{payout:0,label:'Bust — dealer wins'};if(dealerNatural&&playerNatural)return{payout:hand.bet,label:'Blackjack push'};if(dealerNatural)return{payout:0,label:'Dealer blackjack'};if(playerNatural)return{payout:Math.floor(hand.bet*2.5),label:'Natural blackjack!'};if(dealerTotal>21||playerTotal>dealerTotal)return{payout:hand.bet*2,label:'You win!'};if(playerTotal===dealerTotal)return{payout:hand.bet,label:'Push — wager returned'};return{payout:0,label:'Dealer wins'};
  }
  finish(){
    const r=this.round;if(!r||r.settled)return;r.settled=true;const allBusted=r.hands.every(h=>handTotal(h.cards)>21);if(!allBusted)while(handTotal(r.dealer)<17)r.dealer.push(r.shoe.pop());const dealerTotal=handTotal(r.dealer),dealerNatural=r.dealer.length===2&&dealerTotal===21,results=r.hands.map(h=>this.settleHand(h,dealerTotal,dealerNatural));this.renderRound(true);$('message').innerHTML=results.map((result,i)=>{const net=result.payout-r.hands[i].bet;return`${r.hands.length>1?`Hand ${i+1}: `:''}${result.label} <span class="${net>=0?'positive':'negative'}">(${net>=0?'+':''}${money(net)})</span>`;}).join(' · ');results.forEach((result,i)=>{const hand=r.hands[i],record=settle(r.hands.length>1?`Blackjack · Hand ${i+1}`:'Blackjack',hand.bet,result.payout,{quiet:true,metadata:{split:hand.fromSplit,doubleDown:hand.doubled}});if(record.net>0){signal('blackjack-win');if(hand.fromSplit)signal('split-win');if(hand.doubled)signal('double-win');}});const net=results.reduce((sum,result,i)=>sum+result.payout-r.hands[i].bet,0);toast(`Blackjack: ${net>=0?'+':''}${money(net)} net`,net>0?'win':net<0?'loss':'tap');this.round=null;this.clearRound();$('actions').innerHTML='';renderWallet();
  }
  abandon(){
    const r=this.round;if(!r||r.settled)return;r.hands.forEach((hand,i)=>settle(r.hands.length>1?`Blackjack · Hand ${i+1}`:'Blackjack',hand.bet,0,{quiet:true,metadata:{forfeit:true}}));r.settled=true;this.round=null;this.clearRound();renderWallet();
  }
}

export const blackjackGame=new BlackjackGame();
