/**
 * Deterministic, browser-independent QA simulator.
 * Never used to pick live-game outcomes; production RNG stays cryptographic.
 */
import {rouletteOutcome,slotSymbols,evaluateSlots} from './rules.js';
import {scoreHand} from './strategy.js';
export function makeSeededRng(seed=2026){
  let x=(seed>>>0)||1;
  return max=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%max;};
}
export function simulateRoulette(rounds=10000,pick={type:'red'},seed=2026){
  const draw=makeSeededRng(seed);let payout=0,wins=0;
  for(let i=0;i<rounds;i++){const outcome=rouletteOutcome(draw(37),pick);if(outcome.win){wins++;payout+=outcome.mult;}}
  return {rounds,wins,totalWager:rounds,totalPayout:payout,rtp:payout/rounds};
}
export function simulateSlots(rounds=10000,seed=2026){
  const draw=makeSeededRng(seed),weight=slotSymbols.reduce((n,s)=>n+s.weight,0);
  let payout=0,bonusTriggers=0;
  function symbol(){let r=draw(weight);for(const def of slotSymbols){if(r<def.weight)return def.value;r-=def.weight;}return '🍒';}
  for(let i=0;i<rounds;i++){const grid=Array.from({length:3},()=>Array.from({length:5},symbol));const result=evaluateSlots(grid,700);payout+=result.payout;if(result.freeSpinsAwarded)bonusTriggers++;}
  return {rounds,payout,bonusTriggers,baseSpinRtp:payout/(rounds*700)};
}
export function simulateBlackjackStanding(rounds=10000,seed=2026){
  const draw=makeSeededRng(seed),ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  let wins=0,losses=0,pushes=0;
  const card=()=>ranks[draw(13)];
  for(let i=0;i<rounds;i++){
    const player=[card(),card()],dealer=[card(),card()];
    while(scoreHand(dealer).total<17)dealer.push(card());
    const p=scoreHand(player).total,d=scoreHand(dealer).total;
    if(p>21||(d<=21&&p<d))losses++;else if(d>21||p>d)wins++;else pushes++;
  }
  return {rounds,wins,losses,pushes};
}
