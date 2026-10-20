import {$,money} from '../core/utils.js';
import {getState,getMeta,saveMeta,settleWager} from '../core/store.js';
import {renderWallet,toast,wagerControls,wireBetButtons,playTone} from '../ui/common.js';
import {createBaccaratShoe,baccaratRound,baccaratPayout} from '../core/baccarat.js';
import {signal} from '../progression/progression.js';
const cards=hand=>hand.map(c=>`<span class="playing-card ${'♥♦'.includes(c.s)?'red':''}">${c.r}${c.s}</span>`).join('');
export class BaccaratGame {
 constructor(){this.playing=false;this.pick='banker';this.shoe=[];this.lastBet=null;}
 hasActiveRound(){return this.playing;}
 render(){
  const meta=getMeta(),saved=Number(meta.baccaratLastBet);
  if(this.lastBet===null)this.lastBet=Number.isInteger(saved)&&saved>0&&saved<=10000?saved:25;
  renderWallet();
  $('content').innerHTML=`<section class="game-panel"><span class="pill">VIRTUAL CREDITS</span><h2 style="margin-top:16px">Baccarat</h2><p>Eight-deck Punto Banco. Cards draw automatically. Banker pays 0.95:1 plus stake; Player pays 1:1; Tie pays 8:1. Player and Banker bets push on ties.</p><div class="nv-pick-row" id="baccaratBets">${[['banker','BANKER','0.95:1'],['player','PLAYER','1:1'],['tie','TIE','8:1']].map(([id,name,odds])=>`<button class="secondary nv-pick ${this.pick===id?'active':''}" data-pick="${id}"><strong>${name}</strong><small>${odds}</small></button>`).join('')}</div>${wagerControls('DEAL BACCARAT')}<div id="table" class="felt nv-baccarat-table"><div><div class="v52-table-label">BANKER</div><div id="bankerHand" class="hand"><span class="hint">Ready to deal</span></div></div><div class="v52-table-divider"></div><div><div class="v52-table-label">PLAYER</div><div id="playerHand" class="hand"><span class="hint">Ready to deal</span></div></div></div><div id="message" class="result" role="status"></div></section>`;
  wireBetButtons();$('bet').value=this.lastBet;
  const store=()=>{const bet=Number($('bet').value);if(Number.isSafeInteger(bet)&&bet>=1&&bet<=10000)this.lastBet=bet;};
  $('bet').addEventListener('change',store);$('bet').addEventListener('input',store);
  document.querySelectorAll('#baccaratBets [data-pick]').forEach(b=>b.onclick=()=>{if(this.playing)return;store();this.pick=b.dataset.pick;document.querySelectorAll('#baccaratBets .nv-pick').forEach(n=>n.classList.toggle('active',n===b));});
  $('play').onclick=()=>this.play();
 }
 play(){
  if(this.playing)return;
  const bet=Number($('bet')?.value);if(!Number.isSafeInteger(bet)||bet<1||bet>10000){toast('Enter a whole-dollar wager from $1 to $10,000','loss');return;}
  const cents=bet*100;if(cents>getState().balance){toast('Not enough virtual credits','loss');return;}
  this.lastBet=bet;const meta=getMeta();meta.baccaratLastBet=bet;saveMeta();
  if(this.shoe.length<52)this.shoe=createBaccaratShoe();
  const result=baccaratRound(this.shoe),payout=baccaratPayout(cents,this.pick,result.winner);
  this.playing=true;const record=settleWager('Baccarat',cents,payout,{quiet:true,metadata:{pick:this.pick,...result}});
  if(record.net>0)signal('baccarat-win');
  $('play').disabled=true;document.querySelectorAll('#baccaratBets button').forEach(b=>b.disabled=true);
  playTone('deal');
  const finish=()=>{
   this.playing=false;const banker=$('bankerHand'),player=$('playerHand');if(!banker||!player)return;
   banker.innerHTML=cards(result.banker)+`<strong class="nv-hand-score">TOTAL ${result.bankerTotal}</strong>`;
   player.innerHTML=cards(result.player)+`<strong class="nv-hand-score">TOTAL ${result.playerTotal}</strong>`;
   $('message').innerHTML=`<div class="v52-result-banner"><div><small>RESULT</small><strong>${result.winner.toUpperCase()} ${result.natural?'· NATURAL':''}</strong></div><span class="v52-result-chip ${record.net>0?'positive':record.net<0?'negative':''}">${record.net>=0?'+':''}${money(record.net)}</span></div>`;
   $('play').disabled=false;document.querySelectorAll('#baccaratBets button').forEach(b=>b.disabled=false);
   toast(`Baccarat: ${record.net>=0?'+':''}${money(record.net)} net`,record.net>0?'win':record.net<0?'loss':'tap');
  };
  setTimeout(finish,getMeta().reduceMotion?20:700);
 }
}
export const baccaratGame=new BaccaratGame();
