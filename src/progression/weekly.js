import {getMeta,saveMeta} from '../core/store.js';
const defs=[
 {id:'play20',title:'Casino Explorer',desc:'Settle 20 games this week',event:'round',target:20},
 {id:'blackjack5',title:'Table Veteran',desc:'Win 5 Blackjack hands this week',event:'blackjack-win',target:5},
 {id:'trivia20',title:'Knowledge Master',desc:'Answer 20 trivia questions correctly this week',event:'trivia-correct',target:20},
 {id:'roulette5',title:'Wheel Watcher',desc:'Win 5 Roulette bets this week',event:'roulette-win',target:5}
];
export const weeklyObjectives=defs;
export function weekKey(date=new Date()){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10);}
export function weeklyState(){
 const meta=getMeta(),key=weekKey();
 if(!meta.weekly||meta.weekly.key!==key){meta.weekly={key,progress:{},claimed:{}};saveMeta();}
 return meta.weekly;
}
export function trackWeekly(event){
 const weekly=weeklyState();
 for(const goal of defs)if(goal.event===event&&!weekly.claimed[goal.id]){
   weekly.progress[goal.id]=Math.min(goal.target,(weekly.progress[goal.id]||0)+1);
 }
 saveMeta();
}
export function claimWeekly(id){
 const def=defs.find(g=>g.id===id),weekly=weeklyState(),meta=getMeta();
 if(!def||weekly.claimed[id]||(weekly.progress[id]||0)<def.target)return false;
 weekly.claimed[id]=Date.now();
 meta.xp=(Number(meta.xp)||0)+150;
 meta.cosmeticTokens=(Number(meta.cosmeticTokens)||0)+5;
 saveMeta();
 // Credit-free cosmetic currency and XP only: no wallet manipulation.
 return true;
}
