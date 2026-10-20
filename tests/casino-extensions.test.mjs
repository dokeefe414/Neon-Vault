import test from 'node:test';
import assert from 'node:assert/strict';
import {baccaratTotal,bankerDraws,baccaratRound,baccaratPayout} from '../src/core/baccarat.js';
import {evaluatePoker,pokerPayout,replacePokerCards,POKER_PAYTABLE} from '../src/core/poker.js';
globalThis.localStorage ??= {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const {perfectPairs,plusThree,handTotal}=await import('../src/games/blackjack.js');
const c=(r,s='♠')=>({r,s});
test('Baccarat modulo-ten totals and naturals',()=>{
 assert.equal(baccaratTotal([c('9'),c('7')]),6);
 assert.equal(baccaratTotal([c('A'),c('8')]),9);
 assert.equal(baccaratTotal([c('K'),c('Q')]),0);
});
test('Baccarat banker third-card drawing table',()=>{
 for(let n=0;n<=9;n++){
  assert.equal(bankerDraws(2,n),true);
  assert.equal(bankerDraws(7,n),false);
 }
 assert.equal(bankerDraws(3,8),false);
 assert.equal(bankerDraws(3,7),true);
 assert.equal(bankerDraws(4,1),false);
 assert.equal(bankerDraws(4,2),true);
 assert.equal(bankerDraws(5,3),false);
 assert.equal(bankerDraws(5,4),true);
 assert.equal(bankerDraws(6,6),true);
 assert.equal(bankerDraws(6,5),false);
 assert.equal(bankerDraws(5,null),true);
 assert.equal(bankerDraws(6,null),false);
});
test('Baccarat pushes and commission are paid correctly',()=>{
 assert.equal(baccaratPayout(10000,'player','player'),20000);
 assert.equal(baccaratPayout(10000,'banker','banker'),19500);
 assert.equal(baccaratPayout(101,'banker','banker'),196);
 assert.equal(baccaratPayout(10000,'tie','tie'),90000);
 assert.equal(baccaratPayout(10000,'player','tie'),10000);
 assert.equal(baccaratPayout(10000,'banker','tie'),10000);
 assert.equal(baccaratPayout(10000,'tie','banker'),0);
});
test('Baccarat sample shoe deals distinct cards and winner from totals',()=>{
 const shoe=[c('2','♠'),c('3','♠'),c('4','♠'),c('5','♠'),c('6','♠'),c('7','♠'),c('8','♠')];
 const result=baccaratRound(shoe);
 assert.equal(result.playerTotal,baccaratTotal(result.player));
 assert.equal(result.bankerTotal,baccaratTotal(result.banker));
 assert.ok(['banker','player','tie'].includes(result.winner));
 assert.equal(new Set(result.player.concat(result.banker).map(x=>x.r+x.s)).size,result.player.length+result.banker.length);
});
test('Poker recognizes all nine winning categories and no win',()=>{
 const cases=[
  [['10','J','Q','K','A'].map(r=>c(r)),'royal'],
  [['5','6','7','8','9'].map(r=>c(r)),'straightFlush'],
  [[c('A','♠'),c('A','♥'),c('A','♦'),c('A','♣'),c('2')],'four'],
  [[c('K','♠'),c('K','♥'),c('K','♦'),c('2','♣'),c('2','♠')],'fullHouse'],
  [[c('2'),c('5'),c('7'),c('J'),c('A')],'flush'],
  [[c('A','♠'),c('2','♥'),c('3','♣'),c('4','♦'),c('5','♠')],'straight'],
  [[c('7','♠'),c('7','♥'),c('7','♦'),c('K','♣'),c('3','♠')],'three'],
  [[c('5','♠'),c('5','♥'),c('Q','♦'),c('Q','♣'),c('A','♠')],'twoPair'],
  [[c('J','♠'),c('J','♥'),c('3','♦'),c('4','♣'),c('8','♠')],'jacks'],
  [[c('9','♠'),c('9','♥'),c('3','♦'),c('4','♣'),c('8','♠')],'none']
 ];
 for(const [hand,expected] of cases)assert.equal(evaluatePoker(hand),expected,expected);
});
test('Poker awards correct returns and protects card uniqueness',()=>{
 const royal=['10','J','Q','K','A'].map(r=>c(r));
 assert.equal(pokerPayout(royal,100).payout,100*POKER_PAYTABLE.royal);
 assert.throws(()=>evaluatePoker([c('A'),c('A'),c('3'),c('4'),c('5')]),/Duplicate/);
 const deck=[c('2','♥'),c('3','♦')];
 const hand=[c('A','♠'),c('K','♠'),c('Q','♠'),c('J','♠'),c('9','♠')];
 const updated=replacePokerCards(deck,hand,[true,true,true,false,false]);
 assert.equal(updated[0].r,'A');assert.equal(updated[3].r,'3');assert.equal(updated[4].r,'2');
 assert.throws(()=>replacePokerCards(deck,hand,[true,false]),RangeError);
});
test('Blackjack side bets payout table audits',()=>{
 assert.equal(perfectPairs([c('K','♠'),c('K','♠')],100).payout,2600);
 assert.equal(perfectPairs([c('K','♠'),c('K','♣')],100).payout,1300);
 assert.equal(perfectPairs([c('K','♠'),c('K','♥')],100).payout,700);
 assert.equal(perfectPairs([c('K','♠'),c('3','♠')],100).payout,0);
 assert.equal(plusThree([c('7','♠'),c('8','♠')],c('9','♠'),100).payout,4100);
 assert.equal(plusThree([c('7','♠'),c('7','♥')],c('7','♦'),100).payout,3100);
 assert.equal(handTotal([c('A'),c('A'),c('9')]),21);
});
