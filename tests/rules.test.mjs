import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
  clear(){this.map.clear();}
}

globalThis.localStorage=new MemoryStorage();
globalThis.sessionStorage=new MemoryStorage();
globalThis.window={addEventListener(){},AudioContext:null,webkitAudioContext:null};
globalThis.document={querySelector(){return null;},getElementById(){return null;},body:{classList:{remove(){},add(){}},appendChild(){}}};

const random=await import('../src/core/random.js');
const blackjack=await import('../src/games/blackjack.js');
const roulette=await import('../src/games/roulette.js');

test('deterministic RNG hook controls randomInt and shuffle',()=>{
  const values=[5,1,0];
  random.setRandomSourceForTests(()=>values.shift()??0);
  assert.equal(random.randomInt(10),5);
  assert.deepEqual(random.shuffle(['a','b','c']),['c','a','b']);
  random.resetRandomSource();
});

test('blackjack handTotal handles soft and hard aces',()=>{
  assert.equal(blackjack.handTotal([{r:'A'},{r:'9'}]),20);
  assert.equal(blackjack.handTotal([{r:'A'},{r:'9'},{r:'8'}]),18);
  assert.equal(blackjack.handTotal([{r:'A'},{r:'A'},{r:'9'}]),21);
  assert.equal(blackjack.handTotal([{r:'K'},{r:'Q'},{r:'2'}]),22);
});

test('roulette exact number pays 35:1 plus returned stake',()=>{
  const game=new roulette.RouletteGame();
  assert.deepEqual(game.outcome(17,{type:'number',value:17}),{win:true,mult:36});
  assert.deepEqual(game.outcome(18,{type:'number',value:17}),{win:false,mult:36});
});

test('roulette outside bets correctly lose on zero',()=>{
  const game=new roulette.RouletteGame();
  for(const type of ['red','black','odd','even','low','high','dozen1','column1']){
    assert.deepEqual(game.outcome(0,{type,value:null}),{win:false,mult:0});
  }
});

test('roulette red black and dozens resolve correctly',()=>{
  const game=new roulette.RouletteGame();
  assert.equal(game.outcome(1,{type:'red'}).win,true);
  assert.equal(game.outcome(2,{type:'black'}).win,true);
  assert.deepEqual(game.outcome(12,{type:'dozen1'}),{win:true,mult:3});
  assert.deepEqual(game.outcome(13,{type:'dozen1'}),{win:false,mult:3});
});
