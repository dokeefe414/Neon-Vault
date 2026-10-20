import {$,money} from '../core/utils.js';
import {getState,getMeta,saveMeta,settleWager} from '../core/store.js';
import {renderWallet,toast,wagerControls,wireBetButtons,playTone} from '../ui/common.js';
import {makePokerDeck,pokerPayout,replacePokerCards,POKER_PAYTABLE,POKER_NAMES} from '../core/poker.js';
import {signal} from '../progression/progression.js';
const cardHtml=(c,held,i)=>`<button class="nv-poker-card ${held?'held':''}" data-hold="${i}" aria-pressed="${held}"><span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${c.r}${c.s}</span><small>${held?'HELD':'TAP TO HOLD'}</small></button>`;
export class PokerGame {
 constructor(){this.round=null;this.lastBet=null;}
 hasActiveRound(){return false;}
 render(){
  renderWallet();const meta=getMeta(),saved=Number(meta.pokerLastBet);
  if(this.lastBet===null)this.lastBet=Number.isInteger(saved)&&saved>=1&&saved<=10000?saved:25;
  $('content').innerHTML=`<div class="game-panel"><span class="pill">VIRTUAL CREDITS</span><h2 style="margin-top:16px">Jacks or Better Video Poker</h2><p>Five-card draw using one 52-card deck. Deal five cards, tap the ones you want to hold, then draw. Wager is charged only when you draw; leaving before then never costs credits.</p>${wagerControls('DEAL CARDS')}<div class="nv-poker-table felt"><div class="v52-table-label">YOUR FIVE-CARD HAND</div><div id="pokerHand" class="nv-poker-hand"></div><p class="hint" id="pokerHint">Choose your wager, then deal.</p><div class="controls"><button class="primary" id="pokerDraw" disabled>DRAW HELD CARDS</button><button class="secondary" id="pokerCancel" disabled>CANCEL HAND</button></div></div><div id="message" class="result"></div><div class="pro-panel"><h3>Jacks or Better payouts</h3><div class="nv-paytable">${Object.entries(POKER_PAYTABLE).filter(([key])=>key!=='none').map(([k,m])=>`<span>${POKER_NAMES[k]}</span><strong>${m}:1</strong>`).join('')}</div><p class="hint">Payouts include returned stake for winning hands according to the displayed paytable; a losing hand pays zero. All wagers use fictional credits.</p></div></div>`;
  wireBetButtons();$('bet').value=this.lastBet;
  const store=()=>{const n=Number($('bet').value);if(Number.isSafeInteger(n)&&n>=1&&n<=10000)this.lastBet=n;};
  $('bet').addEventListener('input',store);$('bet').addEventListener('change',store);
  $('play').onclick=()=>this.deal();$('pokerDraw').onclick=()=>this.draw();$('pokerCancel').onclick=()=>this.cancel();
  if(this.round){$('bet').value=this.round.bet/100;this.drawHand();}
 }
 drawHand(){
  const r=this.round;if(!r)return;
  $('pokerHand').innerHTML=r.hand.map((c,i)=>cardHtml(c,r.hold[i],i)).join('');
  document.querySelectorAll('[data-hold]').forEach(button=>button.onclick=()=>{r.hold[Number(button.dataset.hold)]=!r.hold[Number(button.dataset.hold)];this.drawHand();});
  $('pokerHint').textContent=`${r.hold.filter(Boolean).length} held · ${5-r.hold.filter(Boolean).length} cards will be replaced`;
  $('pokerDraw').disabled=false;$('pokerCancel').disabled=false;$('play').disabled=true;$('bet').disabled=true;
 }
 deal(){
  if(this.round)return;
  const dollars=Number($('bet').value);if(!Number.isSafeInteger(dollars)||dollars<1||dollars>10000){toast('Enter a whole-dollar wager from $1 to $10,000','loss');return;}
  const bet=dollars*100;if(bet>getState().balance){toast('Not enough virtual credits','loss');return;}
  this.lastBet=dollars;const meta=getMeta();meta.pokerLastBet=dollars;saveMeta();
  const deck=makePokerDeck(),hand=Array.from({length:5},()=>deck.pop());
  this.round={deck,hand,hold:[false,false,false,false,false],bet};playTone('deal');this.drawHand();
 }
 draw(){
  if(!this.round)return;const r=this.round;
  // Funds can change before draw; the wager is not debited during the deal phase.
  if(r.bet>getState().balance){toast('Not enough credits to complete this draw','loss');return;}
  const final=replacePokerCards(r.deck,r.hand,r.hold);
  const result=pokerPayout(final,r.bet);
  const record=settleWager('Video Poker',r.bet,result.payout,{quiet:true,metadata:{initial:r.hand,hold:r.hold,final,result:result.result}});
  if(record.net>0)signal('poker-win');
  this.round=null;this.render();
  $('pokerHand').innerHTML=final.map(c=>`<div class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${c.r}${c.s}</div>`).join('');
  $('pokerHint').textContent='Completed five-card draw';
  $('message').innerHTML=`<div class="v52-result-banner"><div><small>JACKS OR BETTER</small><strong>${result.label}</strong></div><span class="v52-result-chip ${record.net>0?'positive':record.net<0?'negative':''}">${record.net>=0?'+':''}${money(record.net)}</span></div>`;
  toast(`Video Poker: ${record.net>=0?'+':''}${money(record.net)} net`,record.net>0?'win':record.net<0?'loss':'tap');
 }
 cancel(){if(!this.round)return;this.round=null;this.render();toast('Unplayed hand canceled; no wager charged');}
}
export const pokerGame=new PokerGame();
