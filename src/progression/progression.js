import {DAY,localDateKey,money} from '../core/utils.js';
import {getState,getMeta,saveMeta,updateMeta,grant,subscribe} from '../core/store.js';
import {miniToast,playTone} from '../ui/common.js';
import {trackWeekly} from './weekly.js';

const primaryGame=name=>name==='Blackjack'||/^Blackjack · Hand \d+$/.test(name)||name==='Roulette'||name==='Dice'||/^Slots(?: · Free Spin)?$/.test(name)||/^Trivia \(\d+ streak\)$/.test(name);
const gameKey=name=>name?.startsWith('Blackjack')?'Blackjack':name?.startsWith('Roulette')?'Roulette':name?.startsWith('Slots')?'Slots':name?.startsWith('Dice')?'Dice':name?.startsWith('Trivia')?'Trivia':null;

export function levelInfo(){
  const xp=Math.max(0,Number(getMeta().xp)||0);
  const level=Math.floor(xp/250)+1;
  const current=xp%250;
  const titles=['Rookie','Player','Card Sharp','High Roller','Vault Elite','Neon Legend'];
  return {level,current,next:250,pct:current/250*100,title:titles[Math.min(titles.length-1,Math.floor((level-1)/3))]};
}

export function stats(){
  const history=getState().history||[];
  const primary=history.filter(x=>primaryGame(x.game));
  const gameStats={};
  ['Blackjack','Roulette','Slots','Dice','Trivia'].forEach(name=>gameStats[name]={plays:0,wins:0,losses:0,pushes:0,net:0,wagered:0});
  let wins=0,losses=0,pushes=0,biggestWin=0,biggestLoss=0,streak=0,bestWinStreak=0,triviaBest=0;
  primary.forEach(x=>{
    const key=gameKey(x.game); if(!key) return;
    const net=Number(x.net)||0,g=gameStats[key];
    g.plays++;g.net+=net;g.wagered+=Number(x.bet)||0;
    if(net>0){g.wins++;wins++;streak++;bestWinStreak=Math.max(bestWinStreak,streak);biggestWin=Math.max(biggestWin,net);}
    else if(net<0){g.losses++;losses++;streak=0;biggestLoss=Math.min(biggestLoss,net);}
    else{g.pushes++;pushes++;}
  });
  history.forEach(x=>{const m=/^Trivia \((\d+) streak\)$/.exec(x.game||'');if(m)triviaBest=Math.max(triviaBest,Number(m[1]));});
  const favorite=Object.entries(gameStats).sort((a,b)=>b[1].plays-a[1].plays)[0]?.[0]||'None yet';
  const lifetimeNet=history.reduce((sum,x)=>sum+(Number(x.net)||0),0);
  return {history,primary,totalGames:primary.length,wins,losses,pushes,biggestWin,biggestLoss,bestWinStreak,triviaBest,favorite,lifetimeNet,gameStats};
}

export const achievements=[
  ['first_game','🎟️','First Bet','Settle your first Neon Vault game.',s=>s.totalGames>=1],
  ['blackjack_win','♠️','Beat the Dealer','Win a Blackjack hand.',s=>s.gameStats.Blackjack.wins>=1],
  ['perfect_pair','👯','Perfect Pair','Hit a winning Perfect Pairs side bet.',()=>getState().history.some(x=>x.game==='Blackjack · Perfect Pairs'&&(x.net||0)>0)],
  ['trivia10','🧠','Vault Scholar','Complete a 10-question Trivia Rescue streak.',s=>s.triviaBest>=10],
  ['bankroll5k','💎','Five Grand','Reach a $5,000 virtual bankroll.',()=>getState().balance>=500000],
  ['games100','💯','Century Club','Settle 100 game results.',s=>s.totalGames>=100],
  ['win_streak5','🔥','On Fire','Win five settled games in a row.',s=>s.bestWinStreak>=5],
  ['big_win','⚡','Big Score','Record a single net win of at least $1,000.',s=>s.biggestWin>=100000],
  ['roulette_number','🎯','Straight Up','Win an exact-number Roulette bet.',()=>!!getMeta().flags.rouletteStraightWin],
  ['slot_bonus','✨','Bonus Lights','Trigger a Slots free-spin bonus.',()=>!!getMeta().flags.slotBonus],
  ['split_win','✂️','Split Decision','Win at least one hand after splitting.',()=>!!getMeta().flags.splitWin],
  ['double_win','2×','Double Trouble','Win a doubled-down Blackjack hand.',()=>!!getMeta().flags.doubleWin],
  ['comeback','🔋','Back From Zero','Rebuild from $0 using Trivia Rescue.',()=>!!getMeta().flags.triviaComeback],
  ['challenge','🏆','Daily Duty','Complete a daily challenge.',()=>Number(getMeta().completedChallenges)||0>=1],
  ['level5','◆','Vault Regular','Reach player level 5.',()=>levelInfo().level>=5]
].map(([id,icon,name,desc,test])=>({id,icon,name,desc,test}));

const challenges=[
  {id:'play10',event:'round',target:10,title:'Table Tour',desc:'Settle 10 game results today.'},
  {id:'blackjack3',event:'blackjack-win',target:3,title:'Dealer Hunter',desc:'Win 3 Blackjack hands today.'},
  {id:'roulette2',event:'roulette-win',target:2,title:'Wheel Watcher',desc:'Win 2 Roulette bets today.'},
  {id:'slots3',event:'slots-win',target:3,title:'Reel Runner',desc:'Win 3 slot spins today.'},
  {id:'trivia5',event:'trivia-correct',target:5,title:'Quick Thinker',desc:'Answer 5 trivia questions correctly today.'},
  {id:'double1',event:'double-win',target:1,title:'Double Down',desc:'Win a doubled-down Blackjack hand.'},
  {id:'split1',event:'split-win',target:1,title:'Two Hands',desc:'Win a hand after splitting.'}
];

export function dailyChallenge(){
  const meta=getMeta(),date=localDateKey();
  if(!meta.daily||meta.daily.date!==date){
    const seed=[...date].reduce((n,ch)=>n+ch.charCodeAt(0),0);
    const def=challenges[seed%challenges.length];
    meta.daily={date,id:def.id,progress:0,claimed:false};
    saveMeta();
  }
  const def=challenges.find(x=>x.id===meta.daily.id)||challenges[0];
  return {...def,...meta.daily};
}

export function signal(type){
  trackWeekly(type);
  const meta=getMeta();
  if(type==='roulette-straight-win')meta.flags.rouletteStraightWin=true;
  if(type==='slot-bonus')meta.flags.slotBonus=true;
  if(type==='split-win')meta.flags.splitWin=true;
  if(type==='double-win')meta.flags.doubleWin=true;
  if(type==='trivia-comeback')meta.flags.triviaComeback=true;
  const daily=dailyChallenge();
  if(!daily.claimed&&daily.event===type){
    meta.daily.progress=Math.min(daily.target,(Number(meta.daily.progress)||0)+1);
    if(meta.daily.progress>=daily.target){
      meta.daily.claimed=true;
      meta.completedChallenges=(Number(meta.completedChallenges)||0)+1;
      meta.xp=(Number(meta.xp)||0)+100;
      saveMeta();
      grant(10000,'Daily Challenge Reward');
      miniToast('Daily challenge complete: +$100 virtual credits · +100 XP');
      playTone('unlock');
      checkAchievements();
      return;
    }
  }
  saveMeta();
  checkAchievements();
}

export function checkAchievements(){
  const meta=getMeta(),s=stats();
  let changed=false;
  for(const achievement of achievements){
    if(!meta.achievements[achievement.id]&&achievement.test(s)){
      meta.achievements[achievement.id]=Date.now();
      meta.xp=(Number(meta.xp)||0)+75;
      meta.cosmeticTokens=(Number(meta.cosmeticTokens)||0)+2;
      changed=true;
      miniToast(`Achievement unlocked: ${achievement.name} · +75 XP`);
      playTone('unlock');
    }
  }
  if(changed) saveMeta();
}

export function bankrollPoints(){
  const state=getState(),history=[...(state.history||[])].sort((a,b)=>a.at-b.at);
  const totalNet=history.reduce((sum,x)=>sum+(Number(x.net)||0),0);
  let balance=state.balance-totalNet;
  const points=[{at:history[0]?.at||Date.now(),balance}];
  history.forEach(x=>{balance+=Number(x.net)||0;points.push({at:x.at,balance});});
  if(!history.length)points[0].balance=state.balance;
  return points;
}

subscribe(({type,payload})=>{
  if(type!=='settled') return;
  const record=payload.record;
  if(record.game==='Daily Challenge Reward') return;
  if(primaryGame(record.game)){
    updateMeta(meta=>{meta.xp=(Number(meta.xp)||0)+(record.net>0?30:20);});
    signal('round');
  }else{
    updateMeta(meta=>{meta.xp=(Number(meta.xp)||0)+5;});
  }
  checkAchievements();
});

export {DAY,money};
