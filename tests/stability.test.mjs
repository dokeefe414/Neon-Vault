import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{
 constructor(){this.map=new Map();}
 getItem(k){return this.map.has(k)?this.map.get(k):null;}
 setItem(k,v){this.map.set(k,String(v));}
 removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();
const store=await import('../src/core/store.js');
const {adviseBlackjack}=await import('../src/core/strategy.js');
const {weekKey}=await import('../src/progression/weekly.js');
test('pair of fives against dealer ten uses hit, not stand',()=>{
 assert.equal(adviseBlackjack(['5','5'],'10').action,'HIT');
 assert.equal(adviseBlackjack(['5','5'],'6').action,'DOUBLE');
 assert.equal(adviseBlackjack(['5','5'],'10',{canDouble:false}).action,'HIT');
});
test('week keys are based on local Monday, including Sunday rollover',()=>{
 const sun=new Date(2026,9,18,23,0),mon=new Date(2026,9,19,1,0);
 assert.equal(weekKey(sun),'2026-10-12');
 assert.equal(weekKey(mon),'2026-10-19');
});
test('one-step settleWager records the exact net and is idempotent',()=>{
 const before=store.getState().balance;
 const first=store.settleWager('Dice',1000,2000,{id:'test-dice-1'});
 const again=store.settleWager('Dice',1000,2000,{id:'test-dice-1'});
 assert.equal(first,again);
 assert.equal(store.getState().balance,before+1000);
 assert.equal(store.getState().history.length,1);
 assert.equal(store.getState().ledger.length,1);
});
test('settlement rejects negative, overflow, and unaffordable bets',()=>{
 assert.throws(()=>store.settleWager('Dice',-1,100),RangeError);
 assert.throws(()=>store.settleWager('Dice',99999999,0),RangeError);
 assert.throws(()=>store.settleWager('Dice',100,Number.MAX_SAFE_INTEGER),RangeError);
});
test('invalid import history is rejected without changing wallet',()=>{
 const balance=store.getState().balance;
 assert.throws(()=>store.validateImport({state:{balance:1,ledger:[],history:[{game:'Dice',at:1,bet:100,payout:200,net:999}]}}));
 assert.equal(store.getState().balance,balance);
});
test('stale browser state is not allowed to overwrite newer tab progress',()=>{
 const current=store.getState().balance;
 localStorage.setItem(store.STATE_KEY,JSON.stringify({saveVersion:5,balance:999999,history:[],ledger:[]}));
 assert.throws(()=>store.settleWager('Dice',100,0),store.StaleSaveError);
 assert.throws(()=>store.saveState(),store.StaleSaveError);
 assert.equal(store.getState().balance,current);
});
