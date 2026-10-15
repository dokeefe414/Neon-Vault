import {$,money} from '../core/utils.js';
import {randomInt} from '../core/random.js';
import {getState,debit,settle,getMeta} from '../core/store.js';
import {parseMainBet,renderWallet,toast,wagerControls,wireBetButtons} from '../ui/common.js';
import {signal} from '../progression/progression.js';

const reds=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const color=n=>n===0?'green':reds.has(n)?'red':'black';

export class RouletteGame{
  constructor(){this.pick={type:'red',value:null};this.spinning=false;}
  hasActiveRound(){return this.spinning;}
  label(pick=this.pick){
    const labels={red:'Red',black:'Black',odd:'Odd',even:'Even',low:'1–18',high:'19–36',dozen1:'1st 12',dozen2:'2nd 12',dozen3:'3rd 12',column1:'Column 1',column2:'Column 2',column3:'Column 3',number:`Number ${pick.value??0}`};
    return labels[pick.type]||pick.type;
  }
  outcome(n,pick){
    const t=pick.type;
    if(t==='number')return {win:n===pick.value,mult:36};
    if(n===0)return {win:false,mult:0};
    if(t==='red'||t==='black')return {win:color(n)===t,mult:2};
    if(t==='odd'||t==='even')return {win:n%2?(t==='odd'):(t==='even'),mult:2};
    if(t==='low'||t==='high')return {win:t==='low'?n<=18:n>=19,mult:2};
    if(t.startsWith('dozen')){const d=Number(t.slice(-1));return {win:n>=((d-1)*12+1)&&n<=d*12,mult:3};}
    if(t.startsWith('column')){const c=Number(t.slice(-1));return {win:((n-1)%3)+1===c,mult:3};}
    return {win:false,mult:0};
  }
  render(){
    renderWallet();
    const board=Array.from({length:37},(_,n)=>`<button class="roulette-number ${color(n)} ${this.pick.type==='number'&&this.pick.value===n?'selected':''}" data-number="${n}" ${this.spinning?'disabled':''}>${n}</button>`).join('');
    const types=[['red','RED'],['black','BLACK'],['odd','ODD'],['even','EVEN'],['low','1–18'],['high','19–36'],['dozen1','1ST 12'],['dozen2','2ND 12'],['dozen3','3RD 12'],['column1','COL 1'],['column2','COL 2'],['column3','COL 3']]
      .map(([value,text])=>`<button class="secondary ${this.pick.type===value?'active':''}" data-type="${value}" ${this.spinning?'disabled':''}>${text}</button>`).join('');
    $('content').innerHTML=`<div class="game-panel" style="max-width:1100px"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">Roulette</h2><p>European single-zero roulette. Straight numbers pay 35:1, dozens/columns pay 2:1, and even-money bets pay 1:1.</p>${wagerControls('SPIN WHEEL')}<div class="roulette-layout"><div><div class="roulette-board">${board}</div><p class="hint">Tap any number for a straight-up bet.</p></div><aside class="pro-panel"><div class="pro-kicker">SELECTED BET</div><div class="pro-value" style="font-size:24px">${this.label()}</div><div class="roulette-ball ${this.spinning&&!getMeta().reduceMotion?'spinning':''}" id="rouletteBall">◆</div><div class="controls" style="margin:12px 0">${types}</div><p class="hint">0 is green and loses all outside bets.</p></aside></div><div id="message" class="result"></div></div>`;
    wireBetButtons();
    document.querySelectorAll('[data-number]').forEach(btn=>btn.onclick=()=>{if(this.spinning)return;this.pick={type:'number',value:Number(btn.dataset.number)};this.render();});
    document.querySelectorAll('[data-type]').forEach(btn=>btn.onclick=()=>{if(this.spinning)return;this.pick={type:btn.dataset.type,value:null};this.render();});
    $('play').disabled=this.spinning;
    $('play').onclick=()=>this.spin();
  }
  spin(){
    if(this.spinning)return;
    const bet=parseMainBet();if(bet===null)return;
    if(bet>getState().balance){toast('Not enough credits for that wager','loss');return;}
    const pick={...this.pick},label=this.label(pick),number=randomInt(37),result=this.outcome(number,pick),payout=result.win?bet*result.mult:0;
    this.spinning=true;
    debit(bet,'Roulette wager');
    const record=settle('Roulette',bet,payout,{quiet:true,metadata:{betType:pick.type,betValue:pick.value,result:number}});
    if(result.win){signal('roulette-win');if(pick.type==='number')signal('roulette-straight-win');}
    this.render();
    const finish=()=>{
      this.spinning=false;
      const ball=$('rouletteBall');
      if(ball){ball.classList.remove('spinning');ball.textContent=number;ball.style.color=number===0?'var(--mint)':reds.has(number)?'#ff8ba0':'#fff';}
      if($('message'))$('message').textContent=`${number} ${color(number).toUpperCase()} · ${label} · ${result.win?'WIN':'LOSS'}`;
      toast(`Roulette: ${record.net>=0?'+':''}${money(record.net)} net`,result.win?'win':'loss');
      if($('play'))$('play').disabled=false;
      document.querySelectorAll('[data-number],[data-type]').forEach(btn=>btn.disabled=false);
    };
    setTimeout(finish,getMeta().reduceMotion?30:900);
  }
}

export const rouletteGame=new RouletteGame();
