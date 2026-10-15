import {$} from './core/utils.js';
import {subscribe} from './core/store.js';
import {applyPreferences,renderWallet,toast} from './ui/common.js';
import {checkAchievements,dailyChallenge} from './progression/progression.js';
import {renderHome,renderActivity,renderProfile,renderAchievements,renderChallenges} from './ui/views.js';
import {blackjackGame} from './games/blackjack.js';
import {rouletteGame} from './games/roulette.js';
import {slotsGame} from './games/slots.js';
import {diceGame} from './games/dice.js';
import {triviaGame} from './games/trivia.js';

const games={blackjack:blackjackGame,roulette:rouletteGame,slots:slotsGame,dice:diceGame,trivia:triviaGame};
const titles={home:'The Vault',blackjack:'Blackjack',roulette:'Roulette',slots:'Slots',dice:'Dice',trivia:'Trivia Rescue',profile:'Player Profile',achievements:'Achievements',challenges:'Daily Challenge',history:'Activity'};
let view='home';

function setActiveNav(next){
  document.querySelectorAll('.nav').forEach(button=>button.classList.toggle('active',button.dataset.view===next));
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

export function navigate(next,{force=false}={}){
  if(!titles[next])next='home';
  if(!force&&!canLeaveCurrent(next))return;
  view=next;
  setActiveNav(view);
  $('pageTitle').textContent=titles[view];
  renderCurrent();
}

function renderCurrent(){
  applyPreferences();
  renderWallet();
  try{
    if(view==='home')return renderHome(navigate);
    if(view==='history')return renderActivity();
    if(view==='profile')return renderProfile();
    if(view==='achievements')return renderAchievements();
    if(view==='challenges')return renderChallenges();
    return games[view].render();
  }catch(error){
    console.error('NEON VAULT render error',error);
    $('content').innerHTML='<div class="game-panel"><h2>Something went wrong</h2><p>The current screen could not be rendered. Your saved wallet and history were not cleared.</p><button class="primary" id="recoverHome">RETURN TO DASHBOARD</button></div>';
    $('recoverHome').onclick=()=>navigate('home',{force:true});
    toast('A screen error was caught safely','loss');
  }
}

document.querySelectorAll('.nav').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));

subscribe(({type})=>{
  if(type==='save-replaced')renderCurrent();
  else if(type==='wallet-debit'||type==='state-saved')renderWallet();
});

window.addEventListener('error',event=>console.error('NEON VAULT runtime error',event.error||event.message));
window.addEventListener('unhandledrejection',event=>console.error('NEON VAULT promise rejection',event.reason));

applyPreferences();
dailyChallenge();
checkAchievements();
navigate('home',{force:true});
