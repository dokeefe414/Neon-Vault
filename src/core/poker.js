/** Jacks or Better five-card draw, one deck, payouts per credit wagered. */
import {shuffle} from '../core/random.js';
const RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'],SUITS=['♠','♥','♦','♣'];
export const makePokerDeck=()=>shuffle(SUITS.flatMap(s=>RANKS.map(r=>({r,s}))));
const rankValue=r=>RANKS.indexOf(r)+2;
export function evaluatePoker(hand){
 if(!Array.isArray(hand)||hand.length!==5)throw new RangeError('Five cards required');
 const ids=hand.map(c=>c.r+c.s);
 if(new Set(ids).size!==5)throw new Error('Duplicate cards in poker hand');
 const values=hand.map(c=>rankValue(c.r)).sort((a,b)=>a-b);
 const counts=new Map();for(const n of values)counts.set(n,(counts.get(n)||0)+1);
 const frequency=[...counts.values()].sort((a,b)=>b-a);
 const flush=hand.every(c=>c.s===hand[0].s);
 const distinct=[...new Set(values)];
 const wheel=JSON.stringify(distinct)===JSON.stringify([2,3,4,5,14]);
 const straight=distinct.length===5&&(values[4]-values[0]===4||wheel);
 const royal=straight&&values[0]===10;
 let key='none';
 if(flush&&royal)key='royal';
 else if(flush&&straight)key='straightFlush';
 else if(frequency[0]===4)key='four';
 else if(frequency[0]===3&&frequency[1]===2)key='fullHouse';
 else if(flush)key='flush';
 else if(straight)key='straight';
 else if(frequency[0]===3)key='three';
 else if(frequency[0]===2&&frequency[1]===2)key='twoPair';
 else if(frequency[0]===2&&[11,12,13,14].includes([...counts].find(([,count])=>count===2)?.[0]))key='jacks';
 return key;
}
/** House paytable: multipliers are the TOTAL amount returned, including stake.
 * Jacks-or-Better pairs now return 2x (1:1 net profit), not a break-even push.
 * This is a NEON VAULT variant, not the conventional 9/6 video-poker schedule.
 */
export const POKER_PAYTABLE={royal:800,straightFlush:50,four:25,fullHouse:9,flush:6,straight:4,three:3,twoPair:2,jacks:2,none:0};
export const POKER_NAMES={royal:'Royal Flush',straightFlush:'Straight Flush',four:'Four of a Kind',fullHouse:'Full House',flush:'Flush',straight:'Straight',three:'Three of a Kind',twoPair:'Two Pair',jacks:'Jacks or Better',none:'No winning hand'};
export function pokerPayout(hand,bet){
 if(!Number.isSafeInteger(bet)||bet<=0)throw new RangeError('Invalid video-poker wager');
 const result=evaluatePoker(hand),payout=bet*POKER_PAYTABLE[result];
 if(!Number.isSafeInteger(payout))throw new RangeError('Video-poker payout overflow');
 return {result,label:POKER_NAMES[result],payout};
}
export function replacePokerCards(deck,hand,hold){
 if(!Array.isArray(hand)||hand.length!==5||!Array.isArray(hold)||hold.length!==5||hold.some(x=>typeof x!=='boolean'))throw new RangeError('Invalid held card selection');
 if(deck.length<5-hold.filter(Boolean).length)throw new Error('Poker deck exhausted');
 return hand.map((card,i)=>hold[i]?card:deck.pop());
}
