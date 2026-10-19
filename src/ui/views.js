import {$,DAY,escapeHtml,localDateKey,money} from '../core/utils.js';
import {getState,getMeta,saveMeta,profitSince,exportPayload,validateImport,replaceSave} from '../core/store.js';
import {achievements,bankrollPoints,checkAchievements,dailyChallenge,levelInfo,stats} from '../progression/progression.js';
import {applyPreferences,renderWallet,toast} from './common.js';

const games=[
  ['blackjack','♠','Blackjack','Full table rules, side bets, split, double down, insurance, and surrender.'],
  ['roulette','◉','Roulette','European wheel with straight, even-money, dozen, and column bets.'],
  ['slots','✦','Slots','Five reels, seven paylines, wilds, scatters, and persistent free spins.'],
  ['dice','⚄','Dice','Choose high or low and roll two dice.'],
  ['trivia','?','Trivia Rescue','Build a knowledge streak and cash out up to $5,120.']
];

function chartSVG(range){
  const ms={day:DAY,'7d':7*DAY,'30d':30*DAY,all:null}[range];
  let points=bankrollPoints();
  if(ms){
    const cutoff=Date.now()-ms;
    const prior=points.filter(p=>p.at<cutoff).slice(-1)[0];
    points=points.filter(p=>p.at>=cutoff);
    if(prior)points.unshift({at:cutoff,balance:prior.balance});
  }
  const state=getState();
  if(!points.length)points=[{at:Date.now(),balance:state.balance}];
  if(points.length===1)points.push({at:Date.now()+1,balance:points[0].balance});
  const W=900,H=220,pad=28,min=Math.min(...points.map(p=>p.balance)),max=Math.max(...points.map(p=>p.balance)),span=Math.max(100,max-min),t0=points[0].at,t1=Math.max(t0+1,points.at(-1).at);
  const xy=points.map(p=>({x:pad+(p.at-t0)/(t1-t0)*(W-pad*2),y:H-pad-(p.balance-min)/span*(H-pad*2)}));
  const line=xy.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),area=`${line} L${xy.at(-1).x.toFixed(1)},${H-pad} L${xy[0].x.toFixed(1)},${H-pad} Z`;
  return `<svg class="bankroll-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bankroll over time"><defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--mint)" stop-opacity=".26"/><stop offset="1" stop-color="var(--mint)" stop-opacity="0"/></linearGradient></defs><line class="chart-axis" x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"/><path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/><text class="chart-label" x="${pad}" y="16">High ${money(max)}</text><text class="chart-label" x="${W-pad}" y="16" text-anchor="end">Current ${money(state.balance)}</text><text class="chart-label" x="${pad}" y="${H-7}">${new Date(t0).toLocaleDateString()}</text><text class="chart-label" x="${W-pad}" y="${H-7}" text-anchor="end">${new Date(t1).toLocaleDateString()}</text></svg>`;
}

function wireChart(defaultRange='7d'){
  const draw=range=>{
    const el=$('bankrollChart');if(!el)return;
    el.innerHTML=chartSVG(range);
    document.querySelectorAll('[data-chart-range]').forEach(btn=>btn.classList.toggle('active',btn.dataset.chartRange===range));
  };
  document.querySelectorAll('[data-chart-range]').forEach(btn=>btn.onclick=()=>draw(btn.dataset.chartRange));
  draw(defaultRange);
}

function progressionCard(){
  const l=levelInfo(),daily=dailyChallenge();
  return `<div class="pro-panel"><div class="level-row"><div class="level-badge">${l.level}</div><div style="flex:1"><div class="pro-kicker">PLAYER LEVEL · ${escapeHtml(l.title)}</div><h3 style="margin:4px 0 10px">${l.current} / ${l.next} XP to Level ${l.level+1}</h3><div class="progress-track"><div class="progress-fill" style="width:${l.pct}%"></div></div></div></div><div style="margin-top:15px;color:var(--muted);font-size:13px">Daily: <strong style="color:var(--text)">${escapeHtml(daily.title)}</strong> · ${daily.progress}/${daily.target}${daily.claimed?' · ✓ Complete':''}</div></div>`;
}

export function renderHome(navigate){
  renderWallet();const state=getState(),broke=state.balance===0,s=stats();
  $('content').innerHTML=`<section class="hero"><span class="pill">${broke?'BANKROLL EMPTY':'THE HOUSE IS OPEN'}</span><h2>${broke?'Out of credits? Earn your way back in.':'Your next game starts here.'}</h2><p>${broke?'Trivia Rescue lets you rebuild your virtual bankroll with general-knowledge questions. Correct answers double the current cash-out value, but one wrong answer wipes the uncashed streak.':'Casino games plus a skill-based Trivia Rescue mode. One virtual wallet. Every settled result tracked locally.'}</p><button class="primary" data-go="${broke?'trivia':'blackjack'}">${broke?'START TRIVIA RESCUE →':'ENTER THE TABLE →'}</button></section><div class="stats">${[['BALANCE',money(state.balance),''],['LAST 24 HOURS',money(profitSince(DAY)),profitSince(DAY)>=0?'positive':'negative'],['LAST 7 DAYS',money(profitSince(7*DAY)),profitSince(7*DAY)>=0?'positive':'negative'],['LAST 30 DAYS',money(profitSince(30*DAY)),profitSince(30*DAY)>=0?'positive':'negative']].map(x=>`<div class="stat"><label>${x[0]}</label><strong class="${x[2]}">${x[1]}</strong></div>`).join('')}</div><div class="section-head"><h2>Choose your game</h2><span class="eyebrow">5 EXPERIENCES AVAILABLE</span></div><div class="games">${games.map(g=>`<article class="card"><span class="symbol accent">${g[1]}</span><h3>${g[2]}</h3><p>${g[3]}</p><button data-go="${g[0]}">${g[0]==='trivia'?'START QUIZ':'PLAY NOW'} →</button></article>`).join('')}</div><section style="margin-top:28px"><div class="section-head"><h2>Player progression</h2><button class="secondary" data-go="profile">VIEW PROFILE →</button></div><div class="pro-grid two">${progressionCard()}<div class="pro-panel"><div class="pro-kicker">LIFETIME PERFORMANCE</div><div class="pro-value ${s.lifetimeNet>=0?'positive':'negative'}">${money(s.lifetimeNet)}</div><p class="hint">${s.totalGames} results · ${s.wins} wins · Best streak ${s.bestWinStreak}</p></div></div><div class="pro-panel" style="margin-top:18px"><div class="section-head"><div><div class="pro-kicker">BANKROLL HISTORY</div><h3 style="margin-top:5px">Balance over time</h3></div><div class="range-tabs"><button class="secondary" data-chart-range="day">24H</button><button class="secondary active" data-chart-range="7d">7D</button><button class="secondary" data-chart-range="30d">30D</button><button class="secondary" data-chart-range="all">ALL</button></div></div><div id="bankrollChart" class="chart-wrap"></div></div></section>`;
  document.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.go));wireChart();
}

export function renderActivity(){
  renderWallet();const history=getState().history;
  $('content').innerHTML=`<div class="game-panel"><h2>Activity ledger</h2><p>Net profit = payout minus wager. Rewards and Trivia cash-outs are $0-wager settlements.</p>${history.length?`<div style="overflow:auto"><table class="history-table"><thead><tr><th>Time</th><th>Game</th><th>Wager</th><th>Payout</th><th>Net</th></tr></thead><tbody>${history.slice(-150).reverse().map(x=>`<tr><td>${new Date(x.at).toLocaleString()}</td><td>${escapeHtml(x.game)}</td><td>${money(x.bet)}</td><td>${money(x.payout)}</td><td class="${x.net>=0?'positive':'negative'}">${money(x.net)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No games played yet.</div>'}<p class="hint">Your game history is stored locally in this browser unless you export a backup.</p></div>`;
}

export function renderProfile(){
  renderWallet();const s=stats(),l=levelInfo(),meta=getMeta(),winRate=s.wins+s.losses?Math.round(s.wins/(s.wins+s.losses)*100):0;
  $('content').innerHTML=`<div class="section-head"><div><div class="pro-kicker">PLAYER PROFILE</div><h2 style="margin-top:6px">${escapeHtml(l.title)} · Level ${l.level}</h2></div><button class="secondary" id="exportSave">EXPORT SAVE</button></div><div class="pro-grid"><div class="pro-panel"><div class="pro-kicker">LEVEL</div><div class="pro-value">${l.level}</div><div class="progress-track"><div class="progress-fill" style="width:${l.pct}%"></div></div><p class="hint">${l.current}/${l.next} XP toward Level ${l.level+1}</p></div><div class="pro-panel"><div class="pro-kicker">LIFETIME NET</div><div class="pro-value ${s.lifetimeNet>=0?'positive':'negative'}">${money(s.lifetimeNet)}</div><p class="hint">Current wallet ${money(getState().balance)}</p></div><div class="pro-panel"><div class="pro-kicker">WIN RATE</div><div class="pro-value">${winRate}%</div><p class="hint">${s.wins} wins · ${s.losses} losses · ${s.pushes} pushes</p></div><div class="pro-panel"><div class="pro-kicker">BIGGEST WIN</div><div class="pro-value positive">${money(s.biggestWin)}</div></div><div class="pro-panel"><div class="pro-kicker">BEST WIN STREAK</div><div class="pro-value">${s.bestWinStreak}</div></div><div class="pro-panel"><div class="pro-kicker">FAVORITE GAME</div><div class="pro-value" style="font-size:24px">${escapeHtml(s.favorite)}</div></div></div><div class="pro-grid two" style="margin-top:18px"><div class="pro-panel"><div class="section-head"><h3>Bankroll graph</h3><div class="range-tabs"><button class="secondary" data-chart-range="day">24H</button><button class="secondary active" data-chart-range="7d">7D</button><button class="secondary" data-chart-range="30d">30D</button><button class="secondary" data-chart-range="all">ALL</button></div></div><div id="bankrollChart"></div></div><div class="pro-panel"><h3>Game performance</h3><div style="overflow:auto"><table class="stat-table"><thead><tr><th>Game</th><th>Played</th><th>W-L</th><th>Net</th></tr></thead><tbody>${Object.entries(s.gameStats).map(([name,g])=>`<tr><td>${name}</td><td>${g.plays}</td><td>${g.wins}-${g.losses}</td><td class="${g.net>=0?'positive':'negative'}">${money(g.net)}</td></tr>`).join('')}</tbody></table></div></div></div><div class="pro-panel" style="margin-top:18px"><h3>Settings & save tools</h3><div class="settings-row"><div><strong>Sound effects</strong><div class="hint">Generated locally with the Web Audio API.</div></div><label class="toggle"><input id="soundToggle" type="checkbox" ${meta.sound?'checked':''}> Enabled</label></div><div class="settings-row"><div><strong>Reduced motion</strong><div class="hint">Minimizes reel, wheel, and UI animation.</div></div><label class="toggle"><input id="motionToggle" type="checkbox" ${meta.reduceMotion?'checked':''}> Reduce motion</label></div><div class="settings-row"><div><strong>Vault theme</strong><div class="hint">Purple unlocks at Level 3. Gold unlocks at Level 5.</div></div><select id="themeSelect"><option value="mint">Neon Mint</option>${l.level>=3?'<option value="purple">Midnight Purple</option>':''}${l.level>=5?'<option value="gold">High Roller Gold</option>':''}</select></div><div class="settings-row"><div><strong>Backup / restore</strong><div class="hint">Export wallet, history, XP, achievements, and settings as JSON.</div></div><div class="controls" style="margin:0"><button class="secondary" id="importBtn">IMPORT SAVE</button><input id="importFile" type="file" accept="application/json" hidden></div></div></div>`;
  $('themeSelect').value=meta.theme;
  $('soundToggle').onchange=e=>{meta.sound=e.target.checked;saveMeta();};
  $('motionToggle').onchange=e=>{meta.reduceMotion=e.target.checked;saveMeta();applyPreferences();};
  $('themeSelect').onchange=e=>{meta.theme=e.target.value;saveMeta();applyPreferences();};
  $('exportSave').onclick=()=>{const blob=new Blob([JSON.stringify(exportPayload(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`neon-vault-save-${localDateKey()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Save exported');};
  $('importBtn').onclick=()=>$('importFile').click();
  $('importFile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast('Save file is too large (5 MB limit)','loss');return;}const reader=new FileReader();reader.onload=()=>{try{const parsed=validateImport(JSON.parse(reader.result));if(!confirm('Import this save and replace the current local Neon Vault progress?'))return;replaceSave(parsed.state,parsed.meta);location.reload();}catch{toast('That file is not a valid Neon Vault save','loss');}};reader.readAsText(file);};
  wireChart();
}

export function renderAchievements(){
  renderWallet();checkAchievements();const meta=getMeta(),count=Object.keys(meta.achievements).length;
  $('content').innerHTML=`<div class="section-head"><div><div class="pro-kicker">ACHIEVEMENTS</div><h2 style="margin-top:6px">${count} / ${achievements.length} unlocked</h2></div><div class="pill">+75 XP EACH</div></div><div class="achievement-grid">${achievements.map(a=>{const at=meta.achievements[a.id];return `<article class="achievement ${at?'':'locked'}"><span class="ach-icon">${a.icon}</span>${at?'<span class="unlock">UNLOCKED</span>':''}<div class="ach-name">${escapeHtml(a.name)}</div><div class="ach-desc">${escapeHtml(a.desc)}</div>${at?`<div class="hint" style="margin-top:10px">${new Date(at).toLocaleDateString()}</div>`:''}</article>`;}).join('')}</div>`;
}

export function renderChallenges(){
  renderWallet();const d=dailyChallenge(),pct=Math.min(100,d.progress/d.target*100);
  $('content').innerHTML=`<div class="section-head"><div><div class="pro-kicker">DAILY CHALLENGE</div><h2 style="margin-top:6px">Come back every day</h2></div><span class="pill">$100 + 100 XP</span></div><div class="challenge-card ${d.claimed?'challenge-complete':''}"><div class="pro-kicker">TODAY</div><h2 style="margin:8px 0">${escapeHtml(d.title)}</h2><p>${escapeHtml(d.desc)}</p><div class="level-row"><div style="flex:1"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="hint" style="margin-top:9px">Progress ${d.progress}/${d.target}</div></div><div class="challenge-reward">${d.claimed?'✓ CLAIMED':'$100 + 100 XP'}</div></div></div><div class="pro-panel" style="margin-top:18px"><h3>How daily challenges work</h3><p class="hint">One challenge is generated each local calendar day. The reward is virtual credits only and is added automatically.</p><div class="pro-value" style="font-size:24px">${getMeta().completedChallenges||0}</div><div class="pro-kicker">CHALLENGES COMPLETED</div></div>`;
}
