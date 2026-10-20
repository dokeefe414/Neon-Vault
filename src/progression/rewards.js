import {getMeta,saveMeta,getState} from '../core/store.js';
import {localDateKey} from '../core/utils.js';
const MILESTONES=[
 {id:'bronze',title:'Bronze Vault',xp:1000,tokens:4,frame:'bronze'},
 {id:'silver',title:'Silver Vault',xp:2500,tokens:8,frame:'silver'},
 {id:'gold',title:'Golden Vault',xp:5000,tokens:12,frame:'gold'},
 {id:'diamond',title:'Diamond Vault',xp:10000,tokens:20,frame:'diamond'}
];
export const prestigeMilestones=MILESTONES;
export function prestigeStatus(meta=getMeta()){
 const xp=Math.max(0,Number(meta.xp)||0);
 const reached=MILESTONES.filter(item=>xp>=item.xp);
 const next=MILESTONES.find(item=>xp<item.xp);
 return {rank:reached.at(-1)?.title||'Unranked',next,reached,xp};
}
export function rewardState(meta=getMeta()){
 if(!meta.rewardClaims||typeof meta.rewardClaims!=='object'||Array.isArray(meta.rewardClaims))meta.rewardClaims={};
 if(!meta.rewardClaims.prestige||typeof meta.rewardClaims.prestige!=='object')meta.rewardClaims.prestige={};
 return meta.rewardClaims;
}
/** Once per local calendar day. Does not penalize missed days. No wagering required. */
export function claimDailyStyleReward(){
 const meta=getMeta(),claims=rewardState(meta),date=localDateKey();
 if(claims.daily===date)return false;
 claims.daily=date;
 meta.cosmeticTokens=(Number(meta.cosmeticTokens)||0)+2;
 saveMeta();
 return true;
}
export function claimPrestige(id){
 const meta=getMeta(),claims=rewardState(meta);
 const item=MILESTONES.find(m=>m.id===id);
 if(!item||claims.prestige[id]||Number(meta.xp)<item.xp)return false;
 claims.prestige[id]=Date.now();
 meta.cosmeticTokens=(Number(meta.cosmeticTokens)||0)+item.tokens;
 const cosmetics=meta.cosmetics||{};
 const owned=Array.isArray(cosmetics.owned)?cosmetics.owned:[];
 const unlock='frame-'+item.frame;
 if(!owned.includes(unlock))owned.push(unlock);
 meta.cosmetics={...cosmetics,owned,frame:item.frame};
 saveMeta();
 return true;
}
export const cosmeticFrames=['none','bronze','silver','gold','diamond'];
export function gameplayInsights(history=getState().history){
 const normal=history.filter(x=>['Blackjack','Baccarat','Video Poker','Roulette','Dice','Slots'].includes(x.game)||/^Blackjack · Hand \d+$/.test(x.game)||x.game==='Slots · Free Spin');
 const paid=normal.filter(x=>Number(x.bet)>0);
 const byGame={};
 for(const x of normal){
  const game=x.game.startsWith('Blackjack')?'Blackjack':x.game.startsWith('Slots')?'Slots':x.game;
  const item=byGame[game]??={plays:0,wagered:0,returned:0,net:0,biggestWin:0};
  item.plays++;item.wagered+=Number(x.bet)||0;item.returned+=Number(x.payout)||0;item.net+=Number(x.net)||0;item.biggestWin=Math.max(item.biggestWin,Number(x.net)||0);
 }
 const totalBet=paid.reduce((n,x)=>n+x.bet,0),totalPaid=paid.reduce((n,x)=>n+x.payout,0);
 const slots=normal.filter(x=>x.game.startsWith('Slots'));
 return {byGame,paidRounds:paid.length,totalBet,totalPaid,observedReturn:totalBet?totalPaid/totalBet:null,slotBonusSpins:slots.filter(x=>x.freeSpin).length,slotBonusTriggers:slots.filter(x=>x.scatters>=3).length,pokerResults:normal.filter(x=>x.game==='Video Poker').reduce((o,x)=>(o[x.result||'none']=(o[x.result||'none']||0)+1,o),{})};
}
