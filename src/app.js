import {$} from './core/utils.js';
import {subscribe} from './core/store.js';
import {applyPreferences,renderWallet,toast} from './ui/common.js';
import {checkAchievements,dailyChallenge} from './progression/progression.js';
import {currentSession} from './progression/session.js';
import {renderHome,renderActivity,renderProfile,renderAchievements,renderChallenges} from './ui/views.js';
import {blackjackGame} from './games/blackjack.js';
import {rouletteGame} from './games/roulette.js';
import {slotsGame} from './games/slots.js';
import {diceGame} from './games/dice.js';
import {triviaGame} from './games/trivia.js';
import {baccaratGame} from './games/baccarat.js';
import {pokerGame} from './games/poker.js';
import {renderRecords} from './ui/records.js';
import {renderV5View,enhanceV5View,applyCosmetics} from './ui/v5.js';

const games={blackjack:blackjackGame,roulette:rouletteGame,slots:slotsGame,dice:diceGame,trivia:triviaGame,baccarat:baccaratGame,poker:pokerGame};
const titles={home:'The Vault',games:'Games',progress:'Progress',blackjack:'Blackjack',roulette:'Roulette',slots:'Slots',dice:'Dice',trivia:'Trivia Rescue',profile:'Player Profile',achievements:'Achievements',challenges:'Daily Challenge',history:'Activity',guide:'How to Play',trainer:'Blackjack Academy',analytics:'Analytics',wardrobe:'Style Lounge',weekly:'Weekly Challenges',records:'Game Records',baccarat:'Baccarat',poker:'Video Poker'};
let view='home';

function setActiveNav(next){
  document.querySelectorAll('.nav,.dock-nav').forEach(button=>{
    const target=button.dataset.view;
    const active=target===next||(target==='games'&&['blackjack','roulette','slots','dice','baccarat','poker'].includes(next))||(target==='progress'&&['achievements','challenges','history','analytics','weekly','trainer','records'].includes(next));
    button.classList.toggle('active',active);
  });
}

function resetMainScroll(){
  const main=$('mainContent');
  if(main)main.scrollTop=0;
}

function canLeaveCurrent(next){
  if(next===view)return false;
  if(view==='blackjack'&&blackjackGame.hasActiveRound()){
    if(!confirm('A Blackjack hand is still in progress. Leaving now forfeits every unsettled Blackjack hand. Leave anyway?'))return false;
    blackjackGame.abandon();
  }
  if(view==='trivia'&&triviaGame.hasActiveRound()){
    if(!confirm('You have an uncashed Trivia pot. Leaving now loses that uncashed pot. Leave anyway?'))return false;
    triviaGame.abandon();
  }
  return true;
}

function wireHubButtons(){document.querySelectorAll('[data-hub-go]').forEach(button=>button.onclick=()=>navigate(button.dataset.hubGo));}

function renderGamesHub(){
  renderWallet();
  $('content').innerHTML=`<div class="section-head"><div><div class="pro-kicker">CASINO FLOOR</div><h2 style="margin-top:6px">Choose a game</h2></div><span class="pill">VIRTUAL CREDITS ONLY</span></div><div class="games hub-grid"><article class="card hub-card"><span class="symbol accent">♠</span><h3>Blackjack</h3><p>Full table rules, split, double down, insurance, surrender, and side bets.</p><button data-hub-go="blackjack">PLAY BLACKJACK →</button></article><article class="card hub-card"><span class="symbol accent">◉</span><h3>Roulette</h3><p>European single-zero wheel with number, color, dozen, and column bets.</p><button data-hub-go="roulette">SPIN ROULETTE →</button></article><article class="card hub-card"><span class="symbol accent">✦</span><h3>Neon Reels</h3><p>Five reels, seven paylines, wilds, scatters, and persistent free spins.</p><button data-hub-go="slots">SPIN SLOTS →</button></article><article class="card hub-card"><span class="symbol accent">⚄</span><h3>Dice</h3><p>Pick high or low, roll two dice, and try to beat the seven.</p><button data-hub-go="dice">ROLL DICE →</button></article><article class="card hub-card"><span class="symbol accent">◈</span><h3>Baccarat</h3><p>Eight-deck Punto Banco with automatic drawing and banker commission.</p><button data-hub-go="baccarat">PLAY BACCARAT →</button></article><article class="card hub-card"><span class="symbol accent">♦</span><h3>Video Poker</h3><p>Hold and draw Jacks or Better with a full paytable.</p><button data-hub-go="poker">PLAY VIDEO POKER →</button></article></div>`;
  wireHubButtons();
}

function renderProgressHub(){
  renderWallet();
  $('content').innerHTML=`<div class="section-head"><div><div class="pro-kicker">YOUR PROGRESS</div><h2 style="margin-top:6px">Stats, goals, and history</h2></div></div><div class="games hub-grid"><article class="card hub-card"><span class="symbol accent">★</span><h3>Achievements</h3><p>Track milestones, unlock badges, and earn bonus XP.</p><button data-hub-go="achievements">VIEW ACHIEVEMENTS →</button></article><article class="card hub-card"><span class="symbol accent">✓</span><h3>Daily Challenge</h3><p>Complete today’s objective for virtual credits and XP.</p><button data-hub-go="challenges">VIEW CHALLENGE →</button></article><article class="card hub-card"><span class="symbol accent">◷</span><h3>Activity</h3><p>Review wagers, payouts, and net results from your local history.</p><button data-hub-go="history">VIEW ACTIVITY →</button></article><article class="card hub-card"><span class="symbol accent">↶</span><h3>Replays & Records</h3><p>Review finished sessions, hands, and past decisions.</p><button data-hub-go="records">VIEW REPLAYS →</button></article><article class="card hub-card"><span class="symbol accent">▥</span><h3>Analytics</h3><p>Detailed charts and per-game performance.</p><button data-hub-go="analytics">VIEW ANALYTICS →</button></article><article class="card hub-card"><span class="symbol accent">✧</span><h3>Weekly Goals</h3><p>Optional milestones and style tokens.</p><button data-hub-go="weekly">WEEKLY GOALS →</button></article><article class="card hub-card"><span class="symbol accent">♠</span><h3>Strategy Academy</h3><p>Learn Blackjack with practice hands.</p><button data-hub-go="trainer">OPEN TRAINER →</button></article></div>`;
  wireHubButtons();
}

function appendSessionCard(){
  if(view!=='profile')return;
  const host=$('content');if(!host)return;
  const s=currentSession(),minutes=Math.floor(s.durationMs/60000);
  host.insertAdjacentHTML('beforeend',`<div class="pro-panel session-panel" style="margin-top:18px"><div class="section-head"><div><div class="pro-kicker">CURRENT SESSION</div><h3 style="margin-top:6px">Live session analytics</h3></div><span class="pill">${minutes} MIN</span></div><div class="pro-grid"><div><div class="pro-kicker">SESSION P/L</div><div class="pro-value ${s.net>=0?'positive':'negative'}">${(s.net/100).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div></div><div><div class="pro-kicker">RESULTS</div><div class="pro-value">${s.settled}</div></div><div><div class="pro-kicker">BIGGEST WIN</div><div class="pro-value positive">${(s.biggestWin/100).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div></div></div></div>`);
}

export function navigate(next,{force=false}={}){
  if(!titles[next])next='home';
  if(!force&&!canLeaveCurrent(next))return;
  view=next;
  const main=$('mainContent');if(main)main.scrollTop=0;
  setActiveNav(view);
  $('pageTitle').textContent=titles[view];
  resetMainScroll();
  renderCurrent();
  resetMainScroll();
}

function renderCurrent(){
  applyPreferences();
  applyCosmetics();
  renderWallet();
  try{
    if(renderV5View(view,navigate))return;
    if(view==='home'){renderHome(navigate);enhanceV5View(view,navigate);return;}
    if(view==='games')return renderGamesHub();
    if(view==='progress')return renderProgressHub();
    if(view==='history')return renderActivity();
    if(view==='records')return renderRecords();
    if(view==='profile'){renderProfile();appendSessionCard();enhanceV5View(view,navigate);return;}
    if(view==='achievements')return renderAchievements();
    if(view==='challenges')return renderChallenges();
    games[view].render();enhanceV5View(view,navigate);return;
  }catch(error){
    console.error('NEON VAULT render error',error);
    $('content').innerHTML='<div class="game-panel"><h2>Something went wrong</h2><p>The current screen could not be rendered. Your saved wallet and history were not cleared.</p><button class="primary" id="recoverHome">RETURN TO DASHBOARD</button></div>';
    $('recoverHome').onclick=()=>navigate('home',{force:true});
    toast('A screen error was caught safely','loss');
  }
}

document.querySelectorAll('.nav,.dock-nav').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
subscribe(({type})=>{if(type==='save-replaced')renderCurrent();else if(type==='wallet-debit'||type==='state-saved')renderWallet();});
window.addEventListener('error',event=>console.error('NEON VAULT runtime error',event.error||event.message));
window.addEventListener('unhandledrejection',event=>console.error('NEON VAULT promise rejection',event.reason));
// Warn before a stale tab can overwrite local progress changed elsewhere.
window.addEventListener('storage',event=>{
  if(!['neon-vault-save-v1','neon-vault-meta-v2'].includes(event.key))return;
  if(document.getElementById('externalSaveNotice'))return;
  const notice=document.createElement('div');
  notice.id='externalSaveNotice';notice.className='nv-save-warning';notice.setAttribute('role','alertdialog');
  notice.setAttribute('aria-label','Progress updated in another tab');
  notice.innerHTML='<strong>Progress changed in another tab</strong><p>Reload to use the latest virtual wallet and settings. This tab will not overwrite the newer save.</p><button type="button" class="primary" id="reloadExternalSave">RELOAD LATEST SAVE</button>';
  document.body.appendChild(notice);
  document.getElementById('reloadExternalSave').onclick=()=>location.reload();
});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker registration skipped',error)));

applyPreferences();applyCosmetics();
dailyChallenge();
checkAchievements();
navigate('home',{force:true});
