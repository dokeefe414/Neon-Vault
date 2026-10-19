import test from 'node:test';
import assert from 'node:assert/strict';
import {rouletteOutcome,rouletteOrder,rouletteColor,evaluateSlots,evaluateSlotLine,paylines} from '../src/core/rules.js';
import {scoreHand,adviseBlackjack} from '../src/core/strategy.js';
import {makeSeededRng,simulateRoulette,simulateSlots,simulateBlackjackStanding} from '../src/core/simulation.js';
test('European wheel has all 37 numbers exactly once',()=>{
 assert.equal(rouletteOrder.length,37);assert.equal(new Set(rouletteOrder).size,37);
 for(let n=0;n<=36;n++)assert.ok(rouletteOrder.includes(n));
 assert.equal(rouletteColor(0),'green');assert.equal(rouletteColor(1),'red');assert.equal(rouletteColor(2),'black');
});
test('all roulette straight up numbers have exactly one winner',()=>{
 for(let choice=0;choice<=36;choice++){
  let wins=0;
  for(let outcome=0;outcome<=36;outcome++){const result=rouletteOutcome(outcome,{type:'number',value:choice});if(result.win)wins++;assert.equal(result.mult,36);}
  assert.equal(wins,1);
 }
});
test('even money bets pay on 18 of 37 outcomes',()=>{
 for(const type of ['red','black','odd','even','low','high']){let wins=0;for(let n=0;n<37;n++)if(rouletteOutcome(n,{type}).win)wins++;assert.equal(wins,18);}
});
test('each dozen and column wins on 12 of 37 outcomes',()=>{
 for(const prefix of ['dozen','column'])for(let i=1;i<=3;i++){let wins=0;for(let n=0;n<37;n++)if(rouletteOutcome(n,{type:prefix+i}).win)wins++;assert.equal(wins,12);}
});
test('slot pure evaluator catches a five-of-a-kind line',()=>{
 const grid=Array.from({length:3},()=>Array(5).fill('🍒'));
 const result=evaluateSlots(grid,700);
 assert.equal(result.scatters,0);assert.ok(result.wins.length>0);assert.ok(result.payout>0);
});
test('slot scatter bonus triggers at three scatters',()=>{
 const grid=[['✨','✨','✨','🍋','🍋'],Array(5).fill('🍒'),Array(5).fill('🍋')];
 assert.equal(evaluateSlots(grid,700).freeSpinsAwarded,3);
});
test('slot wild replaces normal symbol on left-aligned line',()=>{
 const grid=[['🍋','🍋','🍋','🍋','🍋'],['⭐','🍒','🍒','🍒','🍋'],['🍋','🍋','🍋','🍋','🍋']];
 const result=evaluateSlotLine(grid,paylines[0],100);
 assert.equal(result.count,4);assert.equal(result.symbol,'🍒');assert.ok(result.payout>0);
});
test('Blackjack total respects soft aces',()=>{
 assert.deepEqual(scoreHand(['A','6']),{total:17,soft:true});
 assert.deepEqual(scoreHand(['A','9','9']),{total:19,soft:false});
});
test('basic strategy splits aces and eights',()=>{
 assert.equal(adviseBlackjack(['8','8'],'10').action,'SPLIT');
 assert.equal(adviseBlackjack(['A','A'],'9').action,'SPLIT');
});
test('basic strategy handles hard 16 surrender and hard 20 stand',()=>{
 assert.equal(adviseBlackjack(['10','6'],'10').action,'SURRENDER');
 assert.equal(adviseBlackjack(['K','Q'],'9').action,'STAND');
});
test('seeded simulation repeats identically',()=>{
 assert.deepEqual(simulateRoulette(1500,{type:'red'},22),simulateRoulette(1500,{type:'red'},22));
 assert.deepEqual(simulateSlots(500,22),simulateSlots(500,22));
 assert.deepEqual(simulateBlackjackStanding(500,22),simulateBlackjackStanding(500,22));
 assert.equal(makeSeededRng(3)(37),makeSeededRng(3)(37));
});
test('seeded roulette simulation exhibits plausible European RTP',()=>{
 const sample=simulateRoulette(50000,{type:'red'},333);
 assert.ok(sample.rtp>.93&&sample.rtp<1.02);
});
