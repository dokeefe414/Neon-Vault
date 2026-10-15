import {$,money} from '../core/utils.js';
import {getState,getMeta} from '../core/store.js';

export function renderWallet(){
  const el=$('balance');
  if(el) el.textContent=money(getState().balance);
}

export function toast(message,kind='tap'){
  const el=$('toast');
  if(el){
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>el.classList.remove('show'),3000);
  }
  playTone(kind);
}

export function playTone(kind='tap'){
  if(!getMeta().sound) return;
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext) return;
    playTone.ctx=playTone.ctx||new AudioContext();
    const ctx=playTone.ctx;
    if(ctx.state==='suspended') ctx.resume();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    const [freq,duration]=({win:[660,.09],loss:[180,.11],unlock:[880,.14],tap:[420,.045]})[kind]||[420,.045];
    osc.frequency.value=freq;
    osc.type=kind==='loss'?'sawtooth':'sine';
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.06,ctx.currentTime+.01);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+duration+.02);
  }catch{}
}

export function miniToast(message){
  document.querySelector('.mini-toast')?.remove();
  const el=document.createElement('div');
  el.className='mini-toast';
  el.textContent=message;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}

export function parseMainBet(){
  const dollars=Number($('bet')?.value);
  if(!Number.isSafeInteger(dollars)||dollars<1||dollars>10000){
    toast('Enter a whole-dollar bet from $1 to $10,000','loss');
    return null;
  }
  return dollars*100;
}

export function parseSideBet(id,label){
  const dollars=Number($(id)?.value||0);
  if(!Number.isSafeInteger(dollars)||dollars<0||dollars>10000){
    toast(`${label} must be a whole-dollar bet from $0 to $10,000`,'loss');
    return null;
  }
  return dollars*100;
}

export function wireBetButtons({reserve=0}={}){
  document.querySelectorAll('[data-bet-adjust]').forEach(button=>{
    button.onclick=()=>{
      const input=$('bet');
      if(!input||input.disabled) return;
      const current=Math.max(1,Math.floor(Number(input.value)||1));
      const available=Math.max(0,getState().balance-reserve);
      const walletMax=Math.max(1,Math.min(10000,Math.floor(available/100)));
      input.value=button.dataset.betAdjust==='double'?Math.min(current*2,walletMax):Math.max(1,Math.floor(current/2));
    };
  });
}

export function wagerControls(buttonText='PLAY ROUND',label='Wager ($)'){
  return `<div class="controls"><label for="bet">${label}</label><input id="bet" type="number" min="1" max="10000" step="1" value="25"><button class="secondary" data-bet-adjust="half">½ BET</button><button class="secondary" data-bet-adjust="double">2× BET</button><button class="primary" id="play">${buttonText}</button></div>`;
}

export function applyPreferences(){
  const meta=getMeta();
  document.body.classList.remove('theme-purple','theme-gold','reduce-motion');
  if(meta.theme==='purple') document.body.classList.add('theme-purple');
  if(meta.theme==='gold') document.body.classList.add('theme-gold');
  if(meta.reduceMotion) document.body.classList.add('reduce-motion');
}
