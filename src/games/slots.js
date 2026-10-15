import {$,money} from '../core/utils.js';
import {weightedChoice} from '../core/random.js';
import {getState,getMeta,saveMeta,debit,settle} from '../core/store.js';
import {parseMainBet,renderWallet,toast,wagerControls,wireBetButtons} from '../ui/common.js';
import {signal} from '../progression/progression.js';

const symbols=[
  {value:'🍒',weight:28,p:[0,0,2,5,12,30]},
  {value:'🍋',weight:24,p:[0,0,2,5,15,35]},
  {value:'🔔',weight:18,p:[0,0,3,8,20,50]},
  {value:'💎',weight:12,p:[0,0,4,12,35,90]},
  {value:'7️⃣',weight:8,p:[0,0,6,20,70,200]},
  {value:'⭐',weight:6,p:[0,0,5,15,50,125],wild:true},
  {value:'✨',weight:4,p:[0,0,0,0,0,0],scatter:true}
];
const paylines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0]];
const def=value=>symbols.find(x=>x.value===value);
const spinSymbol=()=>weightedChoice(symbols.map(x=>({value:x.value,weight:x.weight})));

export class SlotsGame{
  constructor(){this.spinning=false;}
  hasActiveRound(){return this.spinning;}
  evaluateLine(grid,line,betPerLine){
    const values=line.map((row,col)=>grid[row][col]);
    let base=null,count=0;
    for(const value of values){
      const item=def(value);
      if(item.scatter)break;
      if(item.wild){count++;continue;}
      if(base===null){base=value;count++;continue;}
      if(value===base){count++;continue;}
      break;
    }
    if(base===null&&count>0)base='⭐';
    if(count<3||!base)return {payout:0,label:''};
    const mult=def(base).p[count]||0;
    return {payout:Math.floor(betPerLine*mult),label:`${base} ×${count} (${mult}×)`};
  }
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
    if(isFree)freeSpins--;else debit(bet,'Slots wager');
    const grid=Array.from({length:3},()=>Array.from({length:5},spinSymbol));
    const wins=paylines.map(line=>this.evaluateLine(grid,line,bet/paylines.length)).filter(x=>x.payout>0);
    const scatters=grid.flat().filter(x=>x==='✨').length;
    const payout=wins.reduce((sum,x)=>sum+x.payout,0);
    if(scatters>=3){
      if(!isFree)freeSpinBet=bet;
      freeSpins+=3;
      signal('slot-bonus');
    }
    if(freeSpins===0)freeSpinBet=0;
    meta.freeSpins=freeSpins;meta.freeSpinBet=freeSpinBet;saveMeta();

    const record=settle(isFree?'Slots · Free Spin':'Slots',isFree?0:bet,payout,{quiet:true,metadata:{freeSpin:isFree,scatters}});
    if(record.net>0)signal('slots-win');
    this.render();
    const gridEl=$('slotGrid');
    if(gridEl&&!getMeta().reduceMotion)gridEl.classList.add('spinning');
    setTimeout(()=>{
      this.spinning=false;
      const el=$('slotGrid');
      if(el){el.classList.remove('spinning');el.innerHTML=Array.from({length:15},(_,i)=>`<div class="slot-cell">${grid[Math.floor(i/5)][i%5]}</div>`).join('');}
      if($('freeSpins'))$('freeSpins').textContent=freeSpins;
      const bonus=scatters>=3?` · BONUS! ${scatters} scatters → +3 free spins`:'';
      if($('message'))$('message').textContent=wins.length?`${wins.length} payline${wins.length>1?'s':''} won · ${money(payout)} returned${bonus}`:`No payline win${bonus}`;
      toast(`Slots: ${record.net>=0?'+':''}${money(record.net)} net`,record.net>0?'win':record.net<0?'loss':'tap');
      if($('play')){$('play').disabled=false;$('play').textContent=freeSpins?`FREE SPIN (${freeSpins})`:'SPIN REELS';}
    },getMeta().reduceMotion?30:750);
  }
}

export const slotsGame=new SlotsGame();
