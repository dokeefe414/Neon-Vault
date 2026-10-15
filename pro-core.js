'use strict';

/*
 * NEON VAULT Pro Core
 * Persistent progression, stats, achievements, challenges, charts, settings,
 * save export/import, and the new portfolio-grade dashboard/profile views.
 * Existing neon-vault-save-v1 data remains fully compatible.
 */
(function(){
  const META_KEY='neon-vault-meta-v2';
  const DAY=864e5;
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const freshMeta=()=>({
    xp:0,
    achievements:{},
    flags:{},
    daily:null,
    completedChallenges:0,
    sound:true,
    reduceMotion:false,
    theme:'mint',
    triviaCategory:'General',
    triviaSeenPro:[],
    createdAt:Date.now()
  });

  function loadMeta(){
    try{
      const parsed=JSON.parse(localStorage.getItem(META_KEY));
      if(parsed&&typeof parsed==='object') return {...freshMeta(),...parsed,achievements:{...(parsed.achievements||{})},flags:{...(parsed.flags||{})}};
    }catch{}
    return freshMeta();
  }

  let meta=loadMeta();
  const saveMeta=()=>{
    try{ localStorage.setItem(META_KEY,JSON.stringify(meta)); }catch{}
  };

  function levelInfo(){
    const xp=Math.max(0,Number(meta.xp)||0);
    const level=Math.floor(xp/250)+1;
    const current=xp%250;
    const titles=['Rookie','Player','Card Sharp','High Roller','Vault Elite','Neon Legend'];
    const title=titles[Math.min(titles.length-1,Math.floor((level-1)/3))];
    return {level,current,next:250,title,pct:Math.min(100,current/250*100)};
  }

  function addXP(amount,reason='Play'){
    meta.xp=Math.max(0,(Number(meta.xp)||0)+Math.max(0,Math.round(amount)));
    saveMeta();
    return levelInfo();
  }

  function applyPreferences(){
    document.body.classList.remove('theme-purple','theme-gold','reduce-motion');
    if(meta.theme==='purple') document.body.classList.add('theme-purple');
    if(meta.theme==='gold') document.body.classList.add('theme-gold');
    if(meta.reduceMotion) document.body.classList.add('reduce-motion');
  }

  function playTone(kind='tap'){
    if(!meta.sound) return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      playTone.ctx=playTone.ctx||new AC();
      const ctx=playTone.ctx;
      if(ctx.state==='suspended') ctx.resume();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      const config={win:[660,.09],loss:[180,.11],unlock:[880,.14],tap:[420,.045]}[kind]||[420,.045];
      osc.frequency.value=config[0];
      osc.type=kind==='loss'?'sawtooth':'sine';
      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.065,ctx.currentTime+.01);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+config[1]);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime+config[1]+.02);
    }catch{}
  }

  function miniToast(text){
    const old=document.querySelector('.mini-toast');
    if(old) old.remove();
    const el=document.createElement('div');
    el.className='mini-toast';
    el.textContent=text;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }

  const legacyToast=toast;
  toast=function(text){
    legacyToast(text);
    const s=String(text).toLowerCase();
    if(/win|correct|cashed|complete|unlocked|blackjack/.test(s)&&!/dealer wins/.test(s)) playTone('win');
    else if(/loss|wrong|bust|dealer wins|lost/.test(s)) playTone('loss');
    else playTone('tap');
  };

  function primaryTransaction(game){
    return game==='Blackjack'||/^Blackjack · Hand \d+$/.test(game)||game==='Roulette'||game==='Dice'||/^Slots(?: · Free Spin)?$/.test(game)||/^Trivia \(\d+ streak\)$/.test(game);
  }

  function gameKey(label){
    if(label.startsWith('Blackjack')) return 'Blackjack';
    if(label.startsWith('Roulette')) return 'Roulette';
    if(label.startsWith('Slots')) return 'Slots';
    if(label.startsWith('Dice')) return 'Dice';
    if(label.startsWith('Trivia')) return 'Trivia';
    return null;
  }

  function derivedStats(){
    const history=Array.isArray(state.history)?state.history:[];
    const primary=history.filter(x=>primaryTransaction(x.game));
    const lifetimeNet=history.reduce((sum,x)=>sum+(Number(x.net)||0),0);
    const gameStats={};
    ['Blackjack','Roulette','Slots','Dice','Trivia'].forEach(name=>gameStats[name]={plays:0,wins:0,losses:0,pushes:0,net:0,wagered:0});
    let biggestWin=0,biggestLoss=0,wins=0,losses=0,pushes=0;
    primary.forEach(x=>{
      const key=gameKey(x.game);
      const net=Number(x.net)||0;
      if(!key) return;
      const g=gameStats[key];
      g.plays++; g.net+=net; g.wagered+=Number(x.bet)||0;
      if(net>0){g.wins++;wins++;biggestWin=Math.max(biggestWin,net);}
      else if(net<0){g.losses++;losses++;biggestLoss=Math.min(biggestLoss,net);}
      else{g.pushes++;pushes++;}
    });
    let currentStreak=0,bestWinStreak=0;
    primary.forEach(x=>{
      if((Number(x.net)||0)>0){currentStreak++;bestWinStreak=Math.max(bestWinStreak,currentStreak);}else if((Number(x.net)||0)<0) currentStreak=0;
    });
    let triviaBest=0;
    history.forEach(x=>{
      const m=/^Trivia \((\d+) streak\)$/.exec(x.game||'');
      if(m) triviaBest=Math.max(triviaBest,Number(m[1]));
    });
    const favorite=Object.entries(gameStats).sort((a,b)=>b[1].plays-a[1].plays)[0]?.[0]||'None yet';
    return {history,primary,totalGames:primary.length,wins,losses,pushes,lifetimeNet,biggestWin,biggestLoss,bestWinStreak,triviaBest,favorite,gameStats};
  }

  const achievements=[
    {id:'first_game',icon:'🎟️',name:'First Bet',desc:'Settle your first Neon Vault game.',test:s=>s.totalGames>=1},
    {id:'blackjack_win',icon:'♠️',name:'Beat the Dealer',desc:'Win a Blackjack hand.',test:s=>s.gameStats.Blackjack.wins>=1},
    {id:'perfect_pair',icon:'👯',name:'Perfect Pair',desc:'Hit a winning Perfect Pairs side bet.',test:()=>state.history.some(x=>x.game==='Blackjack · Perfect Pairs'&&(x.net||0)>0)},
    {id:'trivia10',icon:'🧠',name:'Vault Scholar',desc:'Complete a 10-question Trivia Rescue streak.',test:s=>s.triviaBest>=10},
    {id:'bankroll5k',icon:'💎',name:'Five Grand',desc:'Reach a $5,000 virtual bankroll.',test:()=>state.balance>=500000},
    {id:'games100',icon:'💯',name:'Century Club',desc:'Settle 100 game results.',test:s=>s.totalGames>=100},
    {id:'win_streak5',icon:'🔥',name:'On Fire',desc:'Win five settled games in a row.',test:s=>s.bestWinStreak>=5},
    {id:'big_win',icon:'⚡',name:'Big Score',desc:'Record a single net win of at least $1,000.',test:s=>s.biggestWin>=100000},
    {id:'roulette_number',icon:'🎯',name:'Straight Up',desc:'Win an exact-number Roulette bet.',test:()=>!!meta.flags.rouletteStraightWin},
    {id:'slot_bonus',icon:'✨',name:'Bonus Lights',desc:'Trigger a Slots free-spin bonus.',test:()=>!!meta.flags.slotBonus},
    {id:'split_win',icon:'✂️',name:'Split Decision',desc:'Win at least one hand after splitting in Blackjack.',test:()=>!!meta.flags.splitWin},
    {id:'double_win',icon:'2×',name:'Double Trouble',desc:'Win a doubled-down Blackjack hand.',test:()=>!!meta.flags.doubleWin},
    {id:'comeback',icon:'🔋',name:'Back From Zero',desc:'Rebuild from $0 using Trivia Rescue.',test:()=>!!meta.flags.triviaComeback},
    {id:'challenge',icon:'🏆',name:'Daily Duty',desc:'Complete a daily challenge.',test:()=>meta.completedChallenges>=1},
    {id:'level5',icon:'◆',name:'Vault Regular',desc:'Reach player level 5.',test:()=>levelInfo().level>=5}
  ];

  function checkAchievements(){
    const stats=derivedStats();
    let unlocked=0;
    achievements.forEach(a=>{
      if(!meta.achievements[a.id]&&a.test(stats)){
        meta.achievements[a.id]=Date.now();
        meta.xp=(meta.xp||0)+75;
        unlocked++;
        miniToast(`Achievement unlocked: ${a.name} · +75 XP`);
        playTone('unlock');
      }
    });
    if(unlocked) saveMeta();
  }

  const challengeDefs=[
    {id:'play10',event:'round',target:10,title:'Table Tour',desc:'Settle 10 game results today.'},
    {id:'blackjack3',event:'blackjack-win',target:3,title:'Dealer Hunter',desc:'Win 3 Blackjack hands today.'},
    {id:'roulette2',event:'roulette-win',target:2,title:'Wheel Watcher',desc:'Win 2 Roulette bets today.'},
    {id:'slots3',event:'slots-win',target:3,title:'Reel Runner',desc:'Win 3 slot spins today.'},
    {id:'trivia5',event:'trivia-correct',target:5,title:'Quick Thinker',desc:'Answer 5 trivia questions correctly today.'},
    {id:'double1',event:'double-win',target:1,title:'Double Down',desc:'Win a doubled-down Blackjack hand.'},
    {id:'split1',event:'split-win',target:1,title:'Two Hands',desc:'Win a hand after splitting.'}
  ];

  const localDateKey=()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  function dailyChallenge(){
    const date=localDateKey();
    if(!meta.daily||meta.daily.date!==date){
      const seed=[...date].reduce((n,ch)=>n+ch.charCodeAt(0),0);
      const def=challengeDefs[seed%challengeDefs.length];
      meta.daily={date,id:def.id,progress:0,claimed:false};
      saveMeta();
    }
    const def=challengeDefs.find(x=>x.id===meta.daily.id)||challengeDefs[0];
    return {...def,...meta.daily};
  }

  function grantCredits(cents,label){
    const amount=Math.max(0,Math.round(cents));
    if(!amount) return;
    const at=Date.now();
    state.balance+=amount;
    state.ledger.push({at,net:amount,game:label});
    state.history.push({at,game:label,bet:0,payout:amount,net:amount});
    save();
    renderWallet();
  }

  function event(type,data={}){
    if(type==='roulette-straight-win') meta.flags.rouletteStraightWin=true;
    if(type==='slot-bonus') meta.flags.slotBonus=true;
    if(type==='split-win') meta.flags.splitWin=true;
    if(type==='double-win') meta.flags.doubleWin=true;
    if(type==='trivia-comeback') meta.flags.triviaComeback=true;

    const daily=dailyChallenge();
    if(!daily.claimed&&daily.event===type){
      meta.daily.progress=Math.min(daily.target,(Number(meta.daily.progress)||0)+1);
      if(meta.daily.progress>=daily.target){
        meta.daily.claimed=true;
        meta.completedChallenges=(meta.completedChallenges||0)+1;
        meta.xp=(meta.xp||0)+100;
        grantCredits(10000,'Daily Challenge Reward');
        miniToast(`Daily challenge complete: +$100 virtual credits · +100 XP`);
        playTone('unlock');
      }
    }
    saveMeta();
    checkAchievements();
  }

  const legacyLog=log;
  log=function(game,bet,payout,opts={}){
    const net=legacyLog(game,bet,payout,opts);
    const primary=primaryTransaction(game);
    addXP(primary?(net>0?30:20):5,game);
    if(primary) event('round',{game,net});
    checkAchievements();
    return net;
  };

  function bankrollPoints(){
    const history=[...(state.history||[])].sort((a,b)=>a.at-b.at);
    const totalNet=history.reduce((sum,x)=>sum+(Number(x.net)||0),0);
    let bal=state.balance-totalNet;
    const points=[{at:history[0]?.at||Date.now(),balance:bal}];
    history.forEach(x=>{bal+=Number(x.net)||0;points.push({at:x.at,balance:bal});});
    if(!history.length) points[0].balance=state.balance;
    return points;
  }

  function chartSVG(ms){
    let pts=bankrollPoints();
    if(ms){
      const cutoff=Date.now()-ms;
      let prior=pts.filter(p=>p.at<cutoff).slice(-1)[0];
      pts=pts.filter(p=>p.at>=cutoff);
      if(prior) pts.unshift({at:cutoff,balance:prior.balance});
    }
    if(!pts.length) pts=[{at:Date.now(),balance:state.balance}];
    if(pts.length===1) pts.push({at:Date.now()+1,balance:pts[0].balance});
    const W=900,H=220,pad=28;
    const min=Math.min(...pts.map(p=>p.balance)),max=Math.max(...pts.map(p=>p.balance));
    const span=Math.max(100,max-min);
    const t0=pts[0].at,t1=Math.max(t0+1,pts[pts.length-1].at);
    const xy=pts.map(p=>({x:pad+(p.at-t0)/(t1-t0)*(W-pad*2),y:H-pad-(p.balance-min)/span*(H-pad*2)}));
    const line=xy.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area=`${line} L${xy[xy.length-1].x.toFixed(1)},${H-pad} L${xy[0].x.toFixed(1)},${H-pad} Z`;
    return `<svg class="bankroll-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bankroll over time">
      <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--mint)" stop-opacity=".26"/><stop offset="1" stop-color="var(--mint)" stop-opacity="0"/></linearGradient></defs>
      <line class="chart-axis" x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"/><path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>
      <text class="chart-label" x="${pad}" y="16">High ${money(max)}</text><text class="chart-label" x="${W-pad}" y="16" text-anchor="end">Current ${money(state.balance)}</text>
      <text class="chart-label" x="${pad}" y="${H-7}">${new Date(t0).toLocaleDateString()}</text><text class="chart-label" x="${W-pad}" y="${H-7}" text-anchor="end">${new Date(t1).toLocaleDateString()}</text>
    </svg>`;
  }

  function renderChart(target='bankrollChart',range='7d'){
    const el=$(target); if(!el) return;
    const ms={day:DAY,'7d':7*DAY,'30d':30*DAY,all:null}[range];
    el.innerHTML=chartSVG(ms);
    document.querySelectorAll('[data-chart-range]').forEach(b=>b.classList.toggle('active',b.dataset.chartRange===range));
  }

  function progressionCard(){
    const l=levelInfo();
    const daily=dailyChallenge();
    return `<div class="pro-panel"><div class="level-row"><div class="level-badge">${l.level}</div><div style="flex:1"><div class="pro-kicker">PLAYER LEVEL · ${esc(l.title)}</div><h3 style="margin:4px 0 10px">${l.current} / ${l.next} XP to Level ${l.level+1}</h3><div class="progress-track"><div class="progress-fill" style="width:${l.pct}%"></div></div></div></div><div style="margin-top:15px;color:var(--muted);font-size:13px">Daily: <strong style="color:var(--text)">${esc(daily.title)}</strong> · ${daily.progress}/${daily.target}${daily.claimed?' · ✓ Complete':''}</div></div>`;
  }

  function enhanceHome(){
    const c=$('content'); if(!c||$('homePro')) return;
    const stats=derivedStats();
    c.insertAdjacentHTML('beforeend',`<section id="homePro" style="margin-top:28px"><div class="section-head"><h2>Player progression</h2><button class="secondary" data-pro-go="profile">VIEW PROFILE →</button></div><div class="pro-grid two">${progressionCard()}<div class="pro-panel"><div class="pro-kicker">LIFETIME PERFORMANCE</div><div class="pro-value ${stats.lifetimeNet>=0?'positive':'negative'}">${money(stats.lifetimeNet)}</div><p class="hint">${stats.totalGames} results · ${stats.wins} wins · Best streak ${stats.bestWinStreak}</p><div class="progress-track"><div class="progress-fill" style="width:${stats.totalGames?Math.min(100,stats.wins/stats.totalGames*100):0}%"></div></div></div></div><div class="pro-panel" style="margin-top:18px"><div class="section-head"><div><div class="pro-kicker">BANKROLL HISTORY</div><h3 style="margin-top:5px">Balance over time</h3></div><div class="range-tabs"><button class="secondary" data-chart-range="day">24H</button><button class="secondary active" data-chart-range="7d">7D</button><button class="secondary" data-chart-range="30d">30D</button><button class="secondary" data-chart-range="all">ALL</button></div></div><div id="bankrollChart" class="chart-wrap"></div></div></section>`);
    c.querySelectorAll('[data-pro-go]').forEach(b=>b.onclick=()=>go(b.dataset.proGo));
    c.querySelectorAll('[data-chart-range]').forEach(b=>b.onclick=()=>renderChart('bankrollChart',b.dataset.chartRange));
    renderChart('bankrollChart','7d');
  }

  function renderProfile(){
    renderWallet();
    const c=$('content'),s=derivedStats(),l=levelInfo();
    const winRate=s.wins+s.losses?Math.round(s.wins/(s.wins+s.losses)*100):0;
    c.innerHTML=`<div class="section-head"><div><div class="pro-kicker">PLAYER PROFILE</div><h2 style="margin-top:6px">${esc(l.title)} · Level ${l.level}</h2></div><button class="secondary" id="exportSave">EXPORT SAVE</button></div>
      <div class="pro-grid"><div class="pro-panel"><div class="pro-kicker">LEVEL</div><div class="pro-value">${l.level}</div><div class="progress-track"><div class="progress-fill" style="width:${l.pct}%"></div></div><p class="hint">${l.current}/${l.next} XP toward Level ${l.level+1}</p></div><div class="pro-panel"><div class="pro-kicker">LIFETIME NET</div><div class="pro-value ${s.lifetimeNet>=0?'positive':'negative'}">${money(s.lifetimeNet)}</div><p class="hint">Current wallet ${money(state.balance)}</p></div><div class="pro-panel"><div class="pro-kicker">WIN RATE</div><div class="pro-value">${winRate}%</div><p class="hint">${s.wins} wins · ${s.losses} losses · ${s.pushes} pushes</p></div><div class="pro-panel"><div class="pro-kicker">BIGGEST WIN</div><div class="pro-value positive">${money(s.biggestWin)}</div><p class="hint">Largest net result</p></div><div class="pro-panel"><div class="pro-kicker">BEST WIN STREAK</div><div class="pro-value">${s.bestWinStreak}</div><p class="hint">Consecutive positive results</p></div><div class="pro-panel"><div class="pro-kicker">FAVORITE GAME</div><div class="pro-value" style="font-size:24px">${esc(s.favorite)}</div><p class="hint">Based on plays</p></div></div>
      <div class="pro-grid two" style="margin-top:18px"><div class="pro-panel"><div class="section-head"><h3>Bankroll graph</h3><div class="range-tabs"><button class="secondary" data-chart-range="day">24H</button><button class="secondary active" data-chart-range="7d">7D</button><button class="secondary" data-chart-range="30d">30D</button><button class="secondary" data-chart-range="all">ALL</button></div></div><div id="bankrollChart" class="chart-wrap"></div></div><div class="pro-panel"><h3>Game performance</h3><div style="overflow:auto"><table class="stat-table"><thead><tr><th>Game</th><th>Played</th><th>W-L</th><th>Net</th></tr></thead><tbody>${Object.entries(s.gameStats).map(([name,g])=>`<tr><td>${name}</td><td>${g.plays}</td><td>${g.wins}-${g.losses}</td><td class="${g.net>=0?'positive':'negative'}">${money(g.net)}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="pro-panel" style="margin-top:18px"><h3>Settings & save tools</h3><div class="settings-row"><div><strong>Sound effects</strong><div class="hint">Lightweight generated tones. No audio files or downloads.</div></div><label class="toggle"><input id="soundToggle" type="checkbox" ${meta.sound?'checked':''}> Enabled</label></div><div class="settings-row"><div><strong>Reduced motion</strong><div class="hint">Minimizes reel, wheel, card, and UI animation.</div></div><label class="toggle"><input id="motionToggle" type="checkbox" ${meta.reduceMotion?'checked':''}> Reduce motion</label></div><div class="settings-row"><div><strong>Vault theme</strong><div class="hint">Purple unlocks at Level 3. Gold unlocks at Level 5.</div></div><select id="themeSelect"><option value="mint">Neon Mint</option>${l.level>=3?'<option value="purple">Midnight Purple</option>':''}${l.level>=5?'<option value="gold">High Roller Gold</option>':''}</select></div><div class="settings-row"><div><strong>Backup / restore</strong><div class="hint">Export your wallet, history, XP, achievements, and settings as JSON.</div></div><div class="controls" style="margin:0"><button class="secondary" id="importBtn">IMPORT SAVE</button><input id="importFile" type="file" accept="application/json" hidden></div></div></div>`;
    $('themeSelect').value=meta.theme;
    $('soundToggle').onchange=e=>{meta.sound=e.target.checked;saveMeta();};
    $('motionToggle').onchange=e=>{meta.reduceMotion=e.target.checked;saveMeta();applyPreferences();};
    $('themeSelect').onchange=e=>{meta.theme=e.target.value;saveMeta();applyPreferences();};
    $('exportSave').onclick=exportSave;
    $('importBtn').onclick=()=>$('importFile').click();
    $('importFile').onchange=importSave;
    document.querySelectorAll('[data-chart-range]').forEach(b=>b.onclick=()=>renderChart('bankrollChart',b.dataset.chartRange));
    renderChart('bankrollChart','7d');
  }

  function renderAchievements(){
    renderWallet();checkAchievements();
    const c=$('content');
    const count=Object.keys(meta.achievements).length;
    c.innerHTML=`<div class="section-head"><div><div class="pro-kicker">ACHIEVEMENTS</div><h2 style="margin-top:6px">${count} / ${achievements.length} unlocked</h2></div><div class="pill">+75 XP EACH</div></div><div class="achievement-grid">${achievements.map(a=>{const at=meta.achievements[a.id];return `<article class="achievement ${at?'':'locked'}"><span class="ach-icon">${a.icon}</span>${at?'<span class="unlock">UNLOCKED</span>':''}<div class="ach-name">${esc(a.name)}</div><div class="ach-desc">${esc(a.desc)}</div>${at?`<div class="hint" style="margin-top:10px">${new Date(at).toLocaleDateString()}</div>`:''}</article>`;}).join('')}</div>`;
  }

  function renderChallenges(){
    renderWallet();
    const c=$('content'),d=dailyChallenge();
    const pct=Math.min(100,(d.progress/d.target)*100);
    c.innerHTML=`<div class="section-head"><div><div class="pro-kicker">DAILY CHALLENGE</div><h2 style="margin-top:6px">Come back every day</h2></div><span class="pill">$100 + 100 XP</span></div><div class="challenge-card ${d.claimed?'challenge-complete':''}"><div class="pro-kicker">TODAY</div><h2 style="margin:8px 0">${esc(d.title)}</h2><p>${esc(d.desc)}</p><div class="level-row"><div style="flex:1"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="hint" style="margin-top:9px">Progress ${d.progress}/${d.target}</div></div><div class="challenge-reward">${d.claimed?'✓ CLAIMED':'$100 + 100 XP'}</div></div></div><div class="pro-panel" style="margin-top:18px"><h3>How daily challenges work</h3><p class="hint">One challenge is generated each local calendar day. Progress is saved in this browser. The reward is virtual credits only and is added automatically when the objective is completed.</p><div class="pro-value" style="font-size:24px">${meta.completedChallenges||0}</div><div class="pro-kicker">CHALLENGES COMPLETED</div></div>`;
  }

  function exportSave(){
    const payload={app:'NEON VAULT',version:2,exportedAt:new Date().toISOString(),state,meta};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`neon-vault-save-${localDateKey()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    toast('Save exported');
  }

  function importSave(e){
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        const next=data.state||data;
        if(!Number.isSafeInteger(next.balance)||next.balance<0||!Array.isArray(next.history)||!Array.isArray(next.ledger)) throw new Error('Invalid Neon Vault save');
        if(!confirm('Import this save and replace the current local Neon Vault progress?')) return;
        state={...next};
        meta={...freshMeta(),...(data.meta||{})};
        localStorage.setItem(KEY,JSON.stringify(state));
        localStorage.setItem(META_KEY,JSON.stringify(meta));
        location.reload();
      }catch(err){ toast('That file is not a valid Neon Vault save'); }
    };
    reader.readAsText(file);
  }

  const legacyRender=render;
  render=function(){
    applyPreferences();
    if(view==='profile') return renderProfile();
    if(view==='achievements') return renderAchievements();
    if(view==='challenges') return renderChallenges();
    legacyRender();
    if(view==='home') enhanceHome();
  };

  go=function(v){
    view=v;round=null;trivia=null;
    document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    const titles={home:'The Vault',trivia:'Trivia Rescue',history:'Activity',profile:'Player Profile',achievements:'Achievements',challenges:'Daily Challenge'};
    $('pageTitle').textContent=titles[v]||v[0].toUpperCase()+v.slice(1);
    render();
  };

  document.querySelectorAll('.nav[data-pro-nav]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));

  window.NVPro={
    get meta(){return meta;},
    saveMeta,
    levelInfo,
    addXP,
    derivedStats,
    event,
    playTone,
    miniToast,
    checkAchievements,
    dailyChallenge,
    grantCredits,
    esc,
    gameKey,
    applyPreferences
  };

  applyPreferences();
  dailyChallenge();
  checkAchievements();
})();
