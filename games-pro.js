'use strict';

/* Enhanced Roulette + Slots. Loaded after the original app and Pro Core. */
(function(){
  const rouletteReds=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  let roulettePick={type:'red',value:null};
  let freeSpins=0;

  const legacyRender=render;
  render=function(){
    if(view==='roulette') return renderProRoulette();
    if(view==='slots') return renderProSlots();
    legacyRender();
  };

  function wagerShell(title,subtitle,body,button='PLAY ROUND'){
    const c=$('content');
    c.innerHTML=`<div class="game-panel" style="max-width:1100px"><span class="pill">VIRTUAL TABLE</span><h2 style="margin-top:16px">${title}</h2><p>${subtitle}</p><div class="controls"><label for="bet">Wager ($)</label><input id="bet" type="number" min="1" max="10000" step="1" value="25"><button class="secondary" data-bet-adjust="half">½ BET</button><button class="secondary" data-bet-adjust="double">2× BET</button><button class="primary" id="play">${button}</button></div>${body}<div id="message" class="result"></div></div>`;
    wireBetButtons();
  }

  function rouletteColor(n){return n===0?'green':rouletteReds.has(n)?'red':'black';}
  function betLabel(){
    const labels={red:'Red',black:'Black',odd:'Odd',even:'Even',low:'1–18',high:'19–36',dozen1:'1st 12',dozen2:'2nd 12',dozen3:'3rd 12',column1:'Column 1',column2:'Column 2',column3:'Column 3',number:`Number ${roulettePick.value??0}`};
    return labels[roulettePick.type]||roulettePick.type;
  }

  function renderProRoulette(){
    renderWallet();
    const board=Array.from({length:37},(_,n)=>`<button class="roulette-number ${rouletteColor(n)} ${roulettePick.type==='number'&&roulettePick.value===n?'selected':''}" data-roulette-number="${n}">${n}</button>`).join('');
    const typeButtons=[['red','RED'],['black','BLACK'],['odd','ODD'],['even','EVEN'],['low','1–18'],['high','19–36'],['dozen1','1ST 12'],['dozen2','2ND 12'],['dozen3','3RD 12'],['column1','COL 1'],['column2','COL 2'],['column3','COL 3']].map(([v,t])=>`<button class="secondary ${roulettePick.type===v?'active':''}" data-roulette-type="${v}">${t}</button>`).join('');
    wagerShell('Roulette','European single-zero roulette. Straight numbers pay 35:1, dozens/columns pay 2:1, and even-money bets pay 1:1.',`<div class="roulette-layout"><div><div class="roulette-board">${board}</div><p class="hint">Tap any number for a straight-up bet.</p></div><aside class="pro-panel"><div class="pro-kicker">SELECTED BET</div><div class="pro-value" id="rouletteSelection" style="font-size:24px">${betLabel()}</div><div class="roulette-ball" id="rouletteBall">◆</div><div class="controls" style="margin:12px 0">${typeButtons}</div><p class="hint">0 is green and loses all outside bets.</p></aside></div>`,'SPIN WHEEL');
    document.querySelectorAll('[data-roulette-number]').forEach(b=>b.onclick=()=>{roulettePick={type:'number',value:Number(b.dataset.rouletteNumber)};renderProRoulette();});
    document.querySelectorAll('[data-roulette-type]').forEach(b=>b.onclick=()=>{roulettePick={type:b.dataset.rouletteType,value:null};renderProRoulette();});
    $('play').onclick=spinRoulette;
  }

  function rouletteResult(n){
    const t=roulettePick.type;
    if(t==='number') return {win:n===roulettePick.value,mult:36};
    if(n===0) return {win:false,mult:0};
    if(t==='red'||t==='black') return {win:rouletteColor(n)===t,mult:2};
    if(t==='odd'||t==='even') return {win:(n%2?(t==='odd'):(t==='even')),mult:2};
    if(t==='low'||t==='high') return {win:t==='low'?n<=18:n>=19,mult:2};
    if(t.startsWith('dozen')){const d=Number(t.slice(-1));return {win:n>=((d-1)*12+1)&&n<=d*12,mult:3};}
    if(t.startsWith('column')){const col=Number(t.slice(-1));return {win:((n-1)%3)+1===col,mult:3};}
    return {win:false,mult:0};
  }

  function spinRoulette(){
    const bet=stake(); if(bet===null) return;
    if(bet>state.balance){toast('Not enough credits for that wager');return;}
    debit(bet);
    const n=rand(37),result=rouletteResult(n),payout=result.win?bet*result.mult:0;
    const ball=$('rouletteBall'),btn=$('play'); if(btn) btn.disabled=true;
    if(ball&&!NVPro.meta.reduceMotion) ball.classList.add('spinning');
    const finish=()=>{
      const b=$('rouletteBall'); if(b){b.classList.remove('spinning');b.textContent=n;b.style.color=n===0?'var(--mint)':rouletteReds.has(n)?'#ff8ba0':'#fff';}
      if($('message')) $('message').textContent=`${n} ${rouletteColor(n).toUpperCase()} · ${betLabel()} · ${result.win?'WIN':'LOSS'}`;
      log('Roulette',bet,payout);
      if(result.win){NVPro.event('roulette-win');if(roulettePick.type==='number') NVPro.event('roulette-straight-win');}
      if($('play')) $('play').disabled=false;
    };
    setTimeout(finish,NVPro.meta.reduceMotion?30:900);
  }

  const slotSymbols=[
    {s:'🍒',w:28,p:[0,0,2,5,12,30]},
    {s:'🍋',w:24,p:[0,0,2,5,15,35]},
    {s:'🔔',w:18,p:[0,0,3,8,20,50]},
    {s:'💎',w:12,p:[0,0,4,12,35,90]},
    {s:'7️⃣',w:8,p:[0,0,6,20,70,200]},
    {s:'⭐',w:6,p:[0,0,5,15,50,125],wild:true},
    {s:'✨',w:4,p:[0,0,0,0,0,0],scatter:true}
  ];
  const paylines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0]];
  function weightedSymbol(){const total=slotSymbols.reduce((n,x)=>n+x.w,0);let r=rand(total);for(const x of slotSymbols){if(r<x.w)return x.s;r-=x.w;}return '🍒';}
  function slotDef(s){return slotSymbols.find(x=>x.s===s);}

  function renderProSlots(){
    renderWallet();
    const blank=Array.from({length:15},(_,i)=>`<div class="slot-cell">${['🍒','🍋','🔔','💎','7️⃣'][i%5]}</div>`).join('');
    wagerShell('Neon Reels','Five reels, three rows, seven paylines. ⭐ is wild. Three or more ✨ scatter symbols award 3 free spins.',`<div class="slot-machine"><div class="level-row"><div><div class="pro-kicker">NEON REELS</div><h3 style="margin:4px 0">7 PAYLINES</h3></div><div class="free-spin-badge">FREE SPINS: <span id="freeSpins">${freeSpins}</span></div></div><div id="slotGrid" class="slot-grid">${blank}</div><div class="pro-grid two"><div class="payline-list"><strong>Paytable (5 across)</strong><br>🍒 30× · 🍋 35× · 🔔 50× · 💎 90× · 7️⃣ 200× · ⭐ 125×<br>3+ matching symbols from the left also pay.</div><div class="payline-list"><strong>Bonus</strong><br>⭐ substitutes for normal symbols.<br>3+ ✨ anywhere triggers 3 free spins.</div></div></div>`,'SPIN REELS');
    if(freeSpins>0) $('play').textContent=`FREE SPIN (${freeSpins})`;
    $('play').onclick=spinSlots;
  }

  function evaluateLine(grid,line,betPerLine){
    const vals=line.map((row,col)=>grid[row][col]);
    let base=null,count=0;
    for(const s of vals){
      const d=slotDef(s);
      if(d.scatter) break;
      if(d.wild){count++;continue;}
      if(base===null){base=s;count++;continue;}
      if(s===base){count++;continue;}
      break;
    }
    if(base===null&&count>0) base='⭐';
    if(count<3||!base) return {payout:0,label:''};
    const mult=slotDef(base).p[count]||0;
    return {payout:Math.floor(betPerLine*mult),label:`${base} ×${count} (${mult}×)`};
  }

  function spinSlots(){
    const isFree=freeSpins>0;
    const bet=stake(); if(bet===null) return;
    if(!isFree&&bet>state.balance){toast('Not enough credits for that wager');return;}
    if(isFree) freeSpins--; else debit(bet);
    const grid=Array.from({length:3},()=>Array.from({length:5},weightedSymbol));
    const betPerLine=bet/paylines.length;
    const wins=paylines.map(line=>evaluateLine(grid,line,betPerLine)).filter(x=>x.payout>0);
    const scatters=grid.flat().filter(x=>x==='✨').length;
    let payout=wins.reduce((n,x)=>n+x.payout,0);
    if(scatters>=3){freeSpins+=3;NVPro.event('slot-bonus');}
    const gridEl=$('slotGrid'),btn=$('play');if(btn)btn.disabled=true;
    if(gridEl&&!NVPro.meta.reduceMotion) gridEl.classList.add('spinning');
    const finish=()=>{
      const el=$('slotGrid');if(el){el.classList.remove('spinning');el.innerHTML=Array.from({length:15},(_,i)=>`<div class="slot-cell">${grid[Math.floor(i/5)][i%5]}</div>`).join('');}
      if($('freeSpins')) $('freeSpins').textContent=freeSpins;
      const bonus=scatters>=3?` · BONUS! ${scatters} scatters → +3 free spins`:'';
      if($('message')) $('message').textContent=wins.length?`${wins.length} payline${wins.length>1?'s':''} won · ${money(payout)} returned${bonus}`:`No payline win${bonus}`;
      log(isFree?'Slots · Free Spin':'Slots',isFree?0:bet,payout);
      if(payout>(isFree?0:bet)) NVPro.event('slots-win');
      if($('play')){$('play').disabled=false;$('play').textContent=freeSpins?`FREE SPIN (${freeSpins})`:'SPIN REELS';}
    };
    setTimeout(finish,NVPro.meta.reduceMotion?30:750);
  }
})();
