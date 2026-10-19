import {$,money} from '../core/utils.js';
import {getState,getMeta} from '../core/store.js';

export function renderWallet(){
  const el=$('balance');
  if(el)el.textContent=money(getState().balance);
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
  if(!getMeta().sound)return;
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    playTone.ctx=playTone.ctx||new AudioContext();
    const ctx=playTone.ctx;
    if(ctx.state==='suspended')ctx.resume();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    const [freq,duration]=({win:[660,.09],loss:[180,.11],unlock:[880,.14],tap:[420,.045],deal:[500,.05],chip:[520,.04],spin:[360,.13],level:[950,.17]})[kind]||[420,.045];
    osc.frequency.value=freq;
    osc.type=kind==='loss'?'sawtooth':'sine';
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,.065*(getMeta().volume??.65)),ctx.currentTime+.01);
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
  if(!Number.isSafeInteger(dollars)||dollars<1||dollars>10000){toast('Enter a whole-dollar bet from $1 to $10,000','loss');return null;}
  return dollars*100;
}

export function parseSideBet(id,label){
  const dollars=Number($(id)?.value||0);
  if(!Number.isSafeInteger(dollars)||dollars<0||dollars>10000){toast(`${label} must be a whole-dollar bet from $0 to $10,000`,'loss');return null;}
  return dollars*100;
}

export function wireBetButtons({reserve=0}={}){
  const notifyChanged=input=>input.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelectorAll('[data-bet-adjust]').forEach(button=>{
    button.onclick=()=>{
      const input=$('bet');
      if(!input||input.disabled)return;
      const current=Math.max(1,Math.floor(Number(input.value)||1));
      const available=Math.max(0,getState().balance-reserve);
      const walletMax=Math.max(1,Math.min(10000,Math.floor(available/100)));
      input.value=button.dataset.betAdjust==='double'?Math.min(current*2,walletMax):Math.max(1,Math.floor(current/2));
      notifyChanged(input);
    };
  });
  const input=$('bet');
  if(!input||document.getElementById('chipTray'))return;
  const tray=document.createElement('div');
  tray.id='chipTray';tray.className='chip-tray';tray.setAttribute('aria-label','Virtual betting chips');
  tray.innerHTML='<span>BET CHIPS</span>'+[1,5,25,100,500,1000].map(v=>`<button type="button" class="chip" data-chip="${v}" aria-label="Add ${v} dollar chip"><b>${v>=1000?'1K':v}</b></button>`).join('')+'<button type="button" id="chipUndo" class="secondary">UNDO</button><button type="button" id="chipClear" class="secondary">RESET</button>';
  input.closest('.controls')?.insertAdjacentElement('afterend',tray);
  const previous=[];let firstChip=true;
  input.addEventListener('input',()=>{firstChip=false;previous.length=0;});
  tray.querySelectorAll('[data-chip]').forEach(button=>button.addEventListener('click',()=>{
    if(input.disabled)return;
    const value=Number(button.dataset.chip),before=Math.max(1,Number(input.value)||1);
    const next=Math.min(10000,firstChip?value:before+value);
    previous.push(before);input.value=next;firstChip=false;notifyChanged(input);playTone('chip');
  }));
  tray.querySelector('#chipUndo').onclick=()=>{if(input.disabled)return;input.value=previous.pop()??25;notifyChanged(input);playTone('chip');};
  tray.querySelector('#chipClear').onclick=()=>{if(input.disabled)return;input.value=25;firstChip=true;previous.length=0;notifyChanged(input);};
}

export function wagerControls(buttonText='PLAY ROUND',label='Wager ($)'){
  return `<div class="controls"><label for="bet">${label}</label><input id="bet" type="number" min="1" max="10000" step="1" value="25"><button class="secondary" data-bet-adjust="half">½ BET</button><button class="secondary" data-bet-adjust="double">2× BET</button><button class="primary" id="play">${buttonText}</button></div>`;
}

export function applyPreferences(){
  const meta=getMeta();
  document.body.classList.remove('theme-purple','theme-gold','reduce-motion');
  if(meta.theme==='purple')document.body.classList.add('theme-purple');
  if(meta.theme==='gold')document.body.classList.add('theme-gold');
  if(meta.reduceMotion)document.body.classList.add('reduce-motion');
  const colors={mint:'#090c1b',purple:'#090514',gold:'#0e0a05'};
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors[meta.theme]||colors.mint);
}
