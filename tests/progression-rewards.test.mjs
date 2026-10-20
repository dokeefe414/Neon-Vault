import test from 'node:test';
import assert from 'node:assert/strict';
import {localDateKey} from '../src/core/utils.js';
class MemoryStorage{
 constructor(){this.map=new Map();}
 getItem(k){return this.map.has(k)?this.map.get(k):null;}
 setItem(k,v){this.map.set(k,String(v));}
 removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();
const {getMeta,getState,saveMeta,settleWager}=await import('../src/core/store.js');
const {prestigeStatus,claimPrestige,claimDailyStyleReward,rewardState,gameplayInsights}=await import('../src/progression/rewards.js');
test('daily gift claims at most once per local day',()=>{
 const meta=getMeta(),before=meta.cosmeticTokens;
 assert.equal(claimDailyStyleReward(),true);
 assert.equal(claimDailyStyleReward(),false);
 assert.equal(meta.cosmeticTokens,before+2);
 assert.equal(rewardState(meta).daily,localDateKey());
});
test('prestige milestones require XP and cannot claim twice',()=>{
 const m=getMeta();
 assert.equal(claimPrestige('gold'),false);
 m.xp=2500;saveMeta();
 assert.equal(prestigeStatus(m).rank,'Silver Vault');
 assert.equal(claimPrestige('bronze'),true);
 assert.equal(claimPrestige('bronze'),false);
 assert.equal(claimPrestige('silver'),true);
 assert.ok(m.cosmetics.owned.includes('frame-silver'));
 assert.equal(m.cosmetics.frame,'silver');
 assert.equal(claimPrestige('diamond'),false);
});
test('insights show observed paid-return and independent game buckets',()=>{
 const before=getState().balance;
 settleWager('Video Poker',1000,2000);
 settleWager('Baccarat',1000,0);
 const insights=gameplayInsights();
 assert.equal(insights.totalBet,2000);
 assert.equal(insights.totalPaid,2000);
 assert.equal(insights.observedReturn,1);
 assert.equal(insights.byGame['Video Poker'].net,1000);
 assert.equal(insights.byGame.Baccarat.net,-1000);
 assert.equal(getState().balance,before);
});
