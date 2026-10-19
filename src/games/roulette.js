import {$,money} from '../core/utils.js';
import {randomInt} from '../core/random.js';
import {getState,settleWager,getMeta} from '../core/store.js';
import {parseMainBet,renderWallet,toast,wagerControls,wireBetButtons} from '../ui/common.js';
import {signal} from '../progression/progression.js';
import {rouletteColor,rouletteOutcome,rouletteOrder} from '../core/rules.js';

const color=rouletteColor;
const isActiveView=()=>document.querySelector('.nav[data-view="roulette"]')?.classList.contains('active');

export class RouletteGame{
  constructor(){this.pick={type:'red',value:null};this.spinning=false;this.rotation=0;this.wagerInput=25;}
  hasActiveRound(){return this.spinning;}
  label(pick=this.pick){
    const labels={red:'Red',black:'Black',odd:'Odd',even:'Even',low:'1–18',high:'19–36',dozen1:'1st 12',dozen2:'2nd 12',dozen3:'3rd 12',column1:'Column 1',column2:'Column 2',column3:'Column 3',number:`Number ${pick.value??0}`};
    return labels[pick.type]||pick.type;
  }
  outcome(n,pick){return rouletteOutcome(n,pick);}
  render(){
    renderWallet();
    const board=Array.from({length:37},(_,n)=>`<button class="roulette-number ${color(n)} ${this.pick.type==='number'&&this.pick.value===n?'selected':''}" data-number="${n}" ${this.spinning?'disabled':''}>${n}</button>`).join('');
    const types=[['red','RED'],['black','BLACK'],['odd','ODD'],['even','EVEN'],['low','1–18'],['high','19–36'],['dozen1','1ST 12'],['dozen2','2ND 12'],['dozen3','3RD 12'],['column1','COL 1'],['column2','COL 2'],['column3','COL 3']]
      .map(([value,text])=>`<button class="secondary ${this.pick.type===value?'active':''}" data-type="${value}" ${this.spinning?'disabled':''}>${text}</button>`).join('');
    const sector=360/rouletteOrder.length;
    const wheelBackground=`conic-gradient(${rouletteOrder.map((n,i)=>`${n===0?'#197c59':color(n)==='red'?'#b0364a':'#151a28'} ${i*sector}deg ${(i+1)*sector}deg`).join(',')})`;
    const labels=rouletteOrder.map((n,i)=>`<span class="v5-wheel-label" style="transform:rotate(${i*sector}deg) translateY(-87px) rotate(${-i*sector}deg)">${n}</span>`).join('');
    const wheel=`<div class="v5-wheel-shell"><span class="v5-wheel-pointer"></span><div class="v5-wheel" id="rouletteDisc" style="background:${wheelBackground};transform:rotate(${this.rotation}deg)">${labels}<span class="v5-wheel-hub" style="left:calc(50% - 27px);top:calc(50% - 27px)"></span></div><div class="roulette-ball" id="rouletteBall">◆</div></div>`;
    $('content').innerHTML=`<div class="game-panel" style="max-width:1100px"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">Roulette</h2><p>European single-zero roulette. Straight numbers pay 35:1, dozens/columns pay 2:1, and even-money bets pay 1:1.</p>${wagerControls('SPIN WHEEL')}<div class="roulette-layout"><div><div class="roulette-board">${board}</div><p class="hint">Tap any number for a straight-up bet.</p></div><aside class="pro-panel"><div class="pro-kicker">SELECTED BET</div><div class="pro-value" style="font-size:24px">${this.label()}</div>${wheel}<div class="controls" style="margin:12px 0">${types}</div><p class="hint">0 is green and loses all outside bets.</p></aside></div><div id="message" class="result"></div></div>`;
    wireBetButtons();
    $('bet').value=this.wagerInput;
    const syncWager=e=>{this.wagerInput=Number(e.target.value)||1;};
    $('bet').addEventListener('input',syncWager);
    $('bet').addEventListener('change',syncWager);
    document.querySelectorAll('[data-number]').forEach(btn=>btn.onclick=()=>{if(this.spinning)return;this.wagerInput=Number($('bet').value)||25;this.pick={type:'number',value:Number(btn.dataset.number)};this.render();});
    document.querySelectorAll('[data-type]').forEach(btn=>btn.onclick=()=>{if(this.spinning)return;this.wagerInput=Number($('bet').value)||25;this.pick={type:btn.dataset.type,value:null};this.render();});
    $('play').disabled=this.spinning;
    $('play').onclick=()=>this.spin();
  }
  spin(){
    if(this.spinning)return;
    const bet=parseMainBet();if(bet===null)return;
    if(bet>getState().balance){toast('Not enough credits for that wager','loss');return;}
    const pick={...this.pick},label=this.label(pick),number=randomInt(37),result=this.outcome(number,pick),payout=result.win?bet*result.mult:0;
    this.spinning=true;
    const record=settleWager('Roulette',bet,payout,{quiet:true,metadata:{betType:pick.type,betValue:pick.value,result:number}});
    if(result.win){signal('roulette-win');if(pick.type==='number')signal('roulette-straight-win');}
    this.render();
    const disc=$('rouletteDisc');
    const sector=360/rouletteOrder.length,index=rouletteOrder.indexOf(number);
    // Center the chosen wheel pocket beneath the fixed top pointer.
    const offset=((360-(index+.5)*sector-(this.rotation%360))%360+360)%360;
    this.rotation+=360*5+offset;
    if(disc){if(getMeta().reduceMotion)disc.style.transition='none';requestAnimationFrame(()=>{disc.style.transform=`rotate(${this.rotation}deg)`;});}
    const finish=()=>{
      this.spinning=false;
      if(!isActiveView())return;
      const ball=$('rouletteBall');
      if(ball){ball.classList.remove('spinning');ball.textContent=number;ball.style.color=number===0?'var(--mint)':color(number)==='red'?'#ff8ba0':'#fff';}
      if($('message'))$('message').innerHTML=`<div class="v52-result-banner"><div><small>EUROPEAN WHEEL · ${label}</small><div><strong>${number} ${color(number).toUpperCase()}</strong></div></div><span class="v52-result-chip ${result.win?'positive':'negative'}">${result.win?'WIN':'LOSS'} · ${record.net>=0?'+':''}${money(record.net)}</span></div>`;
      toast(`Roulette: ${record.net>=0?'+':''}${money(record.net)} net`,result.win?'win':'loss');
      if($('play'))$('play').disabled=false;
      document.querySelectorAll('[data-number],[data-type]').forEach(btn=>btn.disabled=false);
    };
    setTimeout(finish,getMeta().reduceMotion?30:1950);
  }
}

export const rouletteGame=new RouletteGame();
