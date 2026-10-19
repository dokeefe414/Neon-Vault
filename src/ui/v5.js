import {$,money,escapeHtml} from '../core/utils.js';
import {getMeta,getState,saveMeta} from '../core/store.js';
import {stats,levelInfo} from '../progression/progression.js';
import {adviseBlackjack} from '../core/strategy.js';
import {weeklyObjectives,weeklyState,claimWeekly} from '../progression/weekly.js';
import {toast} from './common.js';
import {blackjackGame} from '../games/blackjack.js';
const avatars=['◆','♠','★','✦','⚡','🃏','🎲','👑','🦊','🐉'];
const storeItems=[
 {id:'card-indigo',type:'cardBack',value:'indigo',name:'Indigo Card Back',cost:3,icon:'🂠'},
 {id:'card-royal',type:'cardBack',value:'royal',name:'Royal Card Back',cost:6,icon:'🂠'},
 {id:'felt-violet',type:'felt',value:'violet',name:'Violet Felt',cost:4,icon:'♠'},
 {id:'felt-onyx',type:'felt',value:'onyx',name:'Onyx Felt',cost:6,icon:'♠'},
 {id:'badge-vip',type:'badge',value:'VIP',name:'VIP Profile Badge',cost:5,icon:'✧'},
 {id:'badge-legend',type:'badge',value:'Legend',name:'Legend Badge',cost:9,icon:'👑'}
];
const baseCosmetics=()=>({name:'Vault Player',avatar:'◆',cardBack:'classic',felt:'emerald',badge:'Player',owned:[]});
function getCosmetics(){const m=getMeta();if(!m.cosmetics){m.cosmetics=baseCosmetics();saveMeta();}return m.cosmetics;}
export function applyCosmetics(){
 const c=getCosmetics();
 document.body.dataset.felt=['emerald','violet','onyx'].includes(c.felt)?c.felt:'emerald';
 document.body.dataset.cardBack=['classic','indigo','royal'].includes(c.cardBack)?c.cardBack:'classic';
 const tag=document.querySelector('#vaultPlayerTag');
 if(tag)tag.textContent=`${c.avatar} ${c.name}`;
}
export function buildChipStacks(bet){
 const chips=Math.max(1,Math.min(7,Math.ceil((Number(bet)||0)/5000)));
 return `<span class="bet-stack" aria-label="Wager ${money(bet)}">${Array.from({length:chips},(_,i)=>`<i style="--stack:${i}"></i>`).join('')}</span>`;
}
export function renderV5View(view,navigate){
 if(view==='guide'){renderGuide(navigate);return true;}
 if(view==='trainer'){renderTrainer();return true;}
 if(view==='analytics'){renderAnalytics();return true;}
 if(view==='wardrobe'){renderWardrobe();return true;}
 if(view==='weekly'){renderWeekly();return true;}
 return false;
}
export function enhanceV5View(view,navigate){
 applyCosmetics();
 if(view==='home')enhanceHome(navigate);
 if(view==='profile')enhanceProfile(navigate);
 if(view==='blackjack')enhanceBlackjack();
}
function enhanceHome(navigate){
 const c=getCosmetics(),meta=getMeta(),root=$('content');
 if(!root||document.getElementById('v5Welcome'))return;
 root.insertAdjacentHTML('afterbegin',`<div class="v5-welcome" id="v5Welcome"><div class="v5-welcome-icon">${escapeHtml(c.avatar)}</div><div><div class="pro-kicker">NEON VAULT 5 · PLAYER LOUNGE</div><strong>Welcome back, ${escapeHtml(c.name)}.</strong><div class="hint">Level ${levelInfo().level} · ${Number(meta.cosmeticTokens)||0} style tokens · virtual credits only</div></div><button class="secondary" id="v5GuideButton">HOW TO PLAY →</button></div>`);
 document.getElementById('v5GuideButton').onclick=()=>navigate('guide');
}
function enhanceProfile(navigate){
 const c=getCosmetics(),host=$('content');if(!host)return;
 host.insertAdjacentHTML('afterbegin',`<section class="v5-identity pro-panel"><div class="v5-avatar">${escapeHtml(c.avatar)}</div><div><div class="pro-kicker">YOUR VAULT IDENTITY · ${escapeHtml(c.badge)}</div><h2 style="margin:6px 0">${escapeHtml(c.name)}</h2><p class="hint">Customize your avatar and rewards without using virtual bankroll credits.</p></div><button class="secondary" id="editIdentity">CUSTOMIZE →</button></section>`);
 document.getElementById('editIdentity').onclick=()=>navigate('wardrobe');
 const settings=$('themeSelect')?.closest('.pro-panel');
 if(settings){
  settings.insertAdjacentHTML('beforeend',`<div class="settings-row"><div><strong>Sound volume</strong><div class="hint">Choose the intensity of card, chip, and win sounds.</div></div><label>Volume <input id="soundVolume" type="range" min="0" max="100" step="5" value="${Math.round((Number(getMeta().volume)??.65)*100)}"></label></div><div class="settings-row"><div><strong>Learn & explore</strong><div class="hint">Rules, Blackjack strategy, charts, and weekly goals.</div></div><div class="controls"><button class="secondary" id="openGuide">GUIDE</button><button class="secondary" id="openTrainer">TRAINER</button><button class="secondary" id="openAnalytics">ANALYTICS</button></div></div>`);
  document.getElementById('soundVolume').oninput=e=>{getMeta().volume=Number(e.target.value)/100;saveMeta();};
  document.getElementById('openGuide').onclick=()=>navigate('guide');
  document.getElementById('openTrainer').onclick=()=>navigate('trainer');
  document.getElementById('openAnalytics').onclick=()=>navigate('analytics');
 }
}
function enhanceBlackjack(){
 const host=document.querySelector('.game-panel'),actions=$('actions');if(!host||!actions||document.getElementById('blackjackTrainer'))return;
 actions.insertAdjacentHTML('beforebegin','<div class="v5-trainer-inline" id="blackjackTrainer"><button class="secondary" id="basicAdvice">♠ SHOW BASIC STRATEGY</button><span id="adviceText" class="hint" aria-live="polite">Optional trainer. No effect on cards or odds.</span></div>');
 document.getElementById('basicAdvice').onclick=()=>{
  const hand=blackjackGame.currentHand(),round=blackjackGame.round;
  if(!hand||!round){$('adviceText').textContent='Deal a hand first to receive guidance.';return;}
  const advice=adviseBlackjack(hand.cards,round.dealer[0],{canSplit:round.hands.length===1&&!round.actionTaken,canDouble:hand.cards.length===2&&getState().balance>=hand.bet,canSurrender:!round.actionTaken&&!hand.fromSplit&&hand.cards.length===2});
  $('adviceText').textContent=`${advice.action}: ${advice.reason}`;
 };
}
function renderGuide(navigate){
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">WELCOME TO THE VAULT</div><h2>Learn the tables</h2><p class="hint">NEON VAULT uses fictional credits. There are no purchases, cash-outs, real-money bets, or guaranteed wins. Game outcomes use the browser's cryptographic random generator.</p><div class="v5-guide-grid">
 ${[
 ['♠','Blackjack','Try to beat the dealer without exceeding 21. A natural blackjack pays 3:2; the dealer stands on 17. Split matching ranks, double your initial bet, or surrender before acting.','blackjack'],
 ['◉','Roulette','Pick a number, color, odd/even, dozen, or column. The European wheel includes a green zero. A straight-up winning number pays 35:1 plus the original stake.','roulette'],
 ['✦','Neon Reels','Five columns and three rows create seven left-to-right paylines. Wilds replace ordinary symbols. Three scatters trigger free spins.','slots'],
 ['⚄','Dice','Choose high (8–12) or low (2–6). A seven loses. A correct guess returns twice your virtual wager.','dice'],
 ['?','Trivia Rescue','Answer up to ten questions correctly and cash out whenever your streak has value. A wrong answer loses only the uncashed trivia pot.','trivia'],
 ['✧','Progression','Earn XP and style tokens, finish optional daily and weekly goals, and unlock local cosmetics. They never change game odds.','weekly']
 ].map(([icon,title,description,id])=>`<article class="pro-panel"><span class="v5-icon">${icon}</span><h3>${title}</h3><p class="hint">${description}</p><button class="secondary" data-guide="${id}">OPEN →</button></article>`).join('')}</div><div class="pro-panel v5-disclaimer"><h3>Know your limits</h3><p>Everything here is virtual. There is no monetary value or exchange for prizes. Outcome percentages are mathematical properties, not promises about any individual round.</p></div></section>`;
 document.querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>navigate(b.dataset.guide));
 getMeta().tutorialSeen=true;saveMeta();
}
function renderTrainer(){
 const cards=['8','8'],dealer='10';
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">BLACKJACK ACADEMY</div><h2>Basic strategy trainer</h2><p class="hint">Study six-deck basic strategy (dealer stands on soft 17; double after split). Practice suggestions are educational and never alter real game outcomes.</p><div class="v5-practice pro-panel"><div class="v5-practice-cards"><label>First card<select id="practiceCard1">${options(cards[0])}</select></label><label>Second card<select id="practiceCard2">${options(cards[1])}</select></label><label>Dealer upcard<select id="practiceDealer">${options(dealer)}</select></label></div><div id="practiceHand" class="v5-practice-hand"></div><div class="controls"><button class="primary" id="practiceAnswer">REVEAL RECOMMENDATION</button><button class="secondary" id="practiceNext">NEW EXAMPLE</button></div><div class="v5-advice" id="practiceResult" aria-live="polite">Choose cards, then reveal the recommended action.</div></div></section>`;
 const update=()=>{const c1=$('practiceCard1').value,c2=$('practiceCard2').value,d=$('practiceDealer').value;$('practiceHand').innerHTML=`<div class="v5-sample-card">${escapeHtml(c1)}♠</div><div class="v5-sample-card">${escapeHtml(c2)}♥</div><span class="hint">VS</span><div class="v5-sample-card dealer">${escapeHtml(d)}♦</div>`;};
 const reveal=()=>{const result=adviseBlackjack([$('practiceCard1').value,$('practiceCard2').value],$('practiceDealer').value);$('practiceResult').innerHTML=`<strong>${result.action}</strong><span>${escapeHtml(result.reason)}</span><small>Player total: ${result.total}${result.soft?' (soft)':''}</small>`;};
 document.querySelectorAll('.v5-practice-cards select').forEach(s=>s.onchange=()=>{update();$('practiceResult').textContent='Reveal the recommendation when ready.';});
 $('practiceAnswer').onclick=reveal;
 let counter=0;
 $('practiceNext').onclick=()=>{const examples=[['A','7','9'],['10','6','10'],['5','6','6'],['8','8','10'],['9','9','7'],['A','5','5'],['10','2','4']];const e=examples[counter++%examples.length];['practiceCard1','practiceCard2','practiceDealer'].forEach((id,i)=>$(id).value=e[i]);update();$('practiceResult').textContent='Choose your move, then reveal the recommendation.';};
 update();
}
function options(selected){return ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(c=>`<option value="${c}" ${c===selected?'selected':''}>${c}</option>`).join('');}
function renderAnalytics(){
 const s=stats(),history=getState().history,played=s.primary,avg=played.length?played.reduce((n,x)=>n+(x.bet||0),0)/played.length:0;
 const maxLoseStreak=(()=>{let n=0,best=0;for(const p of played){if(p.net<0){n++;best=Math.max(n,best);}else if(p.net>0)n=0;}return best;})();
 const byDay=new Map();for(const x of history){const day=new Date(x.at).toLocaleDateString();byDay.set(day,(byDay.get(day)||0)+(x.net||0));}
 const maxAbs=Math.max(100,...[...byDay.values()].map(Math.abs));
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">THE VAULT INTELLIGENCE DESK</div><h2>Performance analytics</h2><p class="hint">Statistics are calculated from this browser's recorded history, not a cloud account.</p>
 <div class="v5-metrics">${[['RESULTS',s.totalGames],['AVERAGE WAGER',money(avg)],['BEST WIN STREAK',s.bestWinStreak],['LONGEST LOSS STREAK',maxLoseStreak],['BIGGEST LOSS',money(s.biggestLoss)],['BEST TRIVIA STREAK',s.triviaBest]].map(([title,value])=>`<article class="pro-panel"><div class="pro-kicker">${title}</div><div class="v5-metric-value">${value}</div></article>`).join('')}</div>
 <div class="pro-panel"><h3>Daily net performance</h3><div class="v5-bar-chart" aria-label="Daily net results">${[...byDay.entries()].slice(-14).map(([day,net])=>`<div class="v5-bar-row"><span>${escapeHtml(day)}</span><div class="v5-bar-track"><i class="${net>=0?'good':'bad'}" style="width:${Math.max(2,Math.abs(net)/maxAbs*100)}%"></i></div><strong class="${net>=0?'positive':'negative'}">${money(net)}</strong></div>`).join('')||'<p class="hint">Play a game to see results here.</p>'}</div></div>
 <div class="pro-panel"><h3>Results by game</h3><div class="v5-game-metrics">${Object.entries(s.gameStats).map(([name,g])=>`<div class="v5-game-metric"><strong>${name}</strong><span>${g.plays} rounds</span><span>${g.plays?Math.round(g.wins/g.plays*100):0}% positive results</span><strong class="${g.net>=0?'positive':'negative'}">${money(g.net)}</strong></div>`).join('')}</div><p class="hint">A positive result is not the same thing as expected return. Slots' displayed statistics include free-spin payouts when recorded.</p></div></section>`;
}
function renderWardrobe(){
 const c=getCosmetics(),meta=getMeta(),tokens=Number(meta.cosmeticTokens)||0;
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">THE STYLE LOUNGE</div><h2>Customize your profile</h2><p class="hint">Earn cosmetic tokens from achievements and weekly goals. Cosmetic items never change probabilities or game payouts.</p><div class="v5-identity pro-panel"><div class="v5-avatar">${escapeHtml(c.avatar)}</div><div class="v5-name-form"><label class="pro-kicker" for="playerName">DISPLAY NAME (LOCAL ONLY)</label><input id="playerName" maxlength="18" value="${escapeHtml(c.name)}"><button class="primary" id="saveName">SAVE NAME</button><p class="hint">${tokens} style tokens available</p></div></div>
 <h3 style="margin-top:25px">Choose an avatar</h3><div class="v5-avatars">${avatars.map(a=>`<button class="v5-avatar-button ${a===c.avatar?'active':''}" data-avatar="${a}" aria-label="Use avatar ${a}">${a}</button>`).join('')}</div><h3 style="margin:28px 0 14px">Cosmetic collection</h3><div class="v5-shop-grid">${storeItems.map(item=>{const owned=(c.owned||[]).includes(item.id),equipped=c[item.type]===item.value;return `<article class="pro-panel v5-shop"><span class="v5-icon">${item.icon}</span><h3>${item.name}</h3><p class="hint">${owned?'Owned':item.cost+' style tokens'}</p><button class="${equipped?'primary':'secondary'}" data-item="${item.id}">${equipped?'EQUIPPED':owned?'EQUIP':'UNLOCK'}</button></article>`;}).join('')}</div></section>`;
 $('saveName').onclick=()=>{const name=$('playerName').value.trim().slice(0,18);if(!name){toast('Please enter a display name','loss');return;}c.name=name;saveMeta();toast('Profile updated','win');renderWardrobe();};
 document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{c.avatar=b.dataset.avatar;saveMeta();renderWardrobe();});
 document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const item=storeItems.find(i=>i.id===b.dataset.item);if(!item)return;const owned=c.owned||[];if(!owned.includes(item.id)){if((Number(meta.cosmeticTokens)||0)<item.cost){toast('Not enough style tokens','loss');return;}meta.cosmeticTokens-=item.cost;owned.push(item.id);c.owned=owned;}c[item.type]=item.value;saveMeta();applyCosmetics();renderWardrobe();toast('Cosmetic equipped','win');});
}
function renderWeekly(){
 const state=weeklyState(),meta=getMeta();
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">OPTIONAL WEEKLY GOALS</div><h2>Weekly challenges</h2><p class="hint">Goals reset each Monday in your local timezone. Claiming a completed goal awards 150 XP and 5 style tokens—not real money or prizes.</p><div class="v5-weekly-grid">${weeklyObjectives.map(goal=>{const progress=state.progress[goal.id]||0,claimed=!!state.claimed[goal.id],pct=Math.min(100,progress/goal.target*100);return `<article class="pro-panel"><div class="pro-kicker">WEEK OF ${escapeHtml(state.key)}</div><h3>${goal.title}</h3><p class="hint">${goal.desc}</p><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="v5-weekly-footer"><span>${progress} / ${goal.target}</span><button class="${claimed?'secondary':'primary'}" data-claim="${goal.id}" ${claimed||progress<goal.target?'disabled':''}>${claimed?'CLAIMED':progress>=goal.target?'CLAIM +150 XP':'IN PROGRESS'}</button></div></article>`;}).join('')}</div><p class="hint">Style tokens available: ${Number(meta.cosmeticTokens)||0}. <a href="#wardrobe" id="wardrobeFromWeekly">Open Style Lounge</a>.</p></section>`;
 document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{if(claimWeekly(b.dataset.claim)){toast('Weekly reward claimed: +150 XP and +5 style tokens','unlock');renderWeekly();}});
 $('wardrobeFromWeekly').onclick=e=>{e.preventDefault();document.querySelector('button.nav[data-view="profile"]')?.click();};
}
