import {$,money} from '../core/utils.js';
import {weightedChoice} from '../core/random.js';
import {getState,getMeta,saveMeta,settleWager} from '../core/store.js';
import {parseMainBet,renderWallet,toast,wagerControls,wireBetButtons} from '../ui/common.js';
import {signal} from '../progression/progression.js';
import {slotSymbols as symbols,paylines,evaluateSlotLine,evaluateSlots} from '../core/rules.js';

const spinSymbol=()=>weightedChoice(symbols.map(x=>({value:x.value,weight:x.weight})));
const isActiveView=()=>document.querySelector('.nav[data-view="slots"]')?.classList.contains('active');

export class SlotsGame{
  constructor(){this.spinning=false;}
  hasActiveRound(){return this.spinning;}
  evaluateLine(grid,line,betPerLine){return evaluateSlotLine(grid,line,betPerLine);}
  render(){
    renderWallet();
    const meta=getMeta();
    const freeSpins=Math.max(0,Number(meta.freeSpins)||0);
    const freeSpinBet=Math.max(0,Number(meta.freeSpinBet)||0);
    const blank=Array.from({length:15},(_,i)=>`<div class="slot-cell">${['🍒','🍋','🔔','💎','7️⃣'][i%5]}</div>`).join('');
    $('content').innerHTML=`<div class="game-panel" style="max-width:1100px"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">Neon Reels</h2><p>Five reels, three rows, seven paylines. ⭐ is wild. Three or more ✨ scatter symbols award 3 free spins.</p>${wagerControls('SPIN REELS')}<div class="slot-machine"><div class="level-row"><div><div class="pro-kicker">NEON REELS</div><h3 style="margin:4px 0">7 PAYLINES</h3></div><div class="free-spin-badge">FREE SPINS: <span id="freeSpins">${freeSpins}</span></div></div><div id="slotGrid" class="slot-grid">${blank}</div><div class="pro-grid two"><div class="payline-list"><strong>Paytable (5 across)</strong><br>🍒 30× · 🍋 35× · 🔔 50× · 💎 90× · 7️⃣ 200× · ⭐ 125×<br>3+ matching symbols from the left also pay.</div><div class="payline-list"><strong>Bonus</strong><br>⭐ substitutes for normal symbols.<br>3+ ✨ anywhere triggers 3 free spins.<br>Free spins keep the wager that triggered them.</div></div></div><div id="message" class="result"></div></div>`;
    wireBetButtons();
    if(freeSpins>0){
      $('bet').value=(freeSpinBet||2500)/100;
      $('bet').disabled=true;
      document.querySelectorAll('[data-bet-adjust]').forEach(btn=>btn.disabled=true);
      $('play').textContent=`FREE SPIN (${freeSpins})`;
    }
    $('play').disabled=this.spinning;
    $('play').onclick=()=>this.spin();
  }
  spin(){
    if(this.spinning)return;
    const meta=getMeta();
    let freeSpins=Math.max(0,Number(meta.freeSpins)||0);
    let freeSpinBet=Math.max(0,Number(meta.freeSpinBet)||0);
    const isFree=freeSpins>0;
    let bet;
    if(isFree){
      bet=freeSpinBet;
      if(!Number.isSafeInteger(bet)||bet<=0){
        meta.freeSpins=0;meta.freeSpinBet=0;saveMeta();
        toast('Free-spin wager could not be restored','loss');this.render();return;
      }
    }else{
      bet=parseMainBet();if(bet===null)return;
      if(bet>getState().balance){toast('Not enough credits for that wager','loss');return;}
    }

    this.spinning=true;
    if(isFree)freeSpins--;
    const grid=Array.from({length:3},()=>Array.from({length:5},spinSymbol));
    const {wins,scatters,payout}=evaluateSlots(grid,bet);
    if(scatters>=3){
      if(!isFree)freeSpinBet=bet;
      freeSpins+=3;
      signal('slot-bonus');
    }
    if(freeSpins===0)freeSpinBet=0;
    meta.freeSpins=freeSpins;meta.freeSpinBet=freeSpinBet;saveMeta();

    const record=settleWager(isFree?'Slots · Free Spin':'Slots',isFree?0:bet,payout,{quiet:true,metadata:{freeSpin:isFree,scatters,spinBet:bet}});
    if(record.net>0)signal('slots-win');
    this.render();
    const gridEl=$('slotGrid');
    if(gridEl&&!getMeta().reduceMotion)gridEl.classList.add('spinning');
    const reduced=getMeta().reduceMotion,duration=reduced?30:1100;
    if(!reduced){for(let column=0;column<5;column++)setTimeout(()=>{
      if(!isActiveView()||!$('slotGrid'))return;
      for(let row=0;row<3;row++){
        const cell=$('slotGrid').children[row*5+column];
        if(cell){cell.textContent=grid[row][column];cell.classList.add('v5-stop');}
      }
    },(column+1)*175);}
    setTimeout(()=>{
      this.spinning=false;
      if(!isActiveView())return;
      const el=$('slotGrid');
      if(el){el.classList.remove('spinning');el.innerHTML=Array.from({length:15},(_,i)=>`<div class="slot-cell ${wins.some(win=>paylines[win.index][i%5]===Math.floor(i/5)&&i%5<win.count)?'v5-win':''}">${grid[Math.floor(i/5)][i%5]}</div>`).join('');}
      if($('freeSpins'))$('freeSpins').textContent=freeSpins;
      const bonus=scatters>=3?` · BONUS! ${scatters} scatters → +3 free spins`:'';
      if($('message'))$('message').innerHTML=`<div class="v52-result-banner"><div><small>${isFree?'FREE SPIN':'PAID SPIN'} · ${wins.length} PAYLINE${wins.length===1?'':'S'}</small><div><strong>${wins.length?`${money(payout)} returned`:'No payline win'}</strong></div><div class="hint">${bonus||'Five reels · seven ways to win'}</div></div><span class="v52-result-chip ${record.net>0?'positive':record.net<0?'negative':''}">NET ${record.net>=0?'+':''}${money(record.net)}</span></div>`;
      toast(`Slots: ${record.net>=0?'+':''}${money(record.net)} net`,record.net>0?'win':record.net<0?'loss':'tap');
      if($('play')){$('play').disabled=false;$('play').textContent=freeSpins?`FREE SPIN (${freeSpins})`:'SPIN REELS';}
    },duration);
  }
}

export const slotsGame=new SlotsGame();
