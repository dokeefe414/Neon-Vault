import {money} from './utils.js';

export const STATE_KEY='neon-vault-save-v1';
export const META_KEY='neon-vault-meta-v2';
export const START_BALANCE=100000;
export const SAVE_VERSION=5;

const freshState=()=>({saveVersion:SAVE_VERSION,balance:START_BALANCE,ledger:[],history:[]});
const freshMeta=()=>({
  saveVersion:SAVE_VERSION,
  xp:0,
  achievements:{},
  flags:{},
  daily:null,
  completedChallenges:0,
  sound:true,
  reduceMotion:false,
  theme:'mint',
  triviaCategory:'General',
  triviaSeenPro:{},
  freeSpins:0,
  freeSpinBet:0,
  sessions:[],
  volume:.65,
  cosmeticTokens:0,
  cosmetics:{name:'Vault Player',avatar:'◆',cardBack:'classic',felt:'emerald',badge:'Player',owned:[]},
  weekly:null,
  tutorialSeen:false,
  createdAt:Date.now()
});

function parseJSON(key,fallback){
  try{
    const value=JSON.parse(localStorage.getItem(key));
    return value&&typeof value==='object'?value:fallback();
  }catch{
    return fallback();
  }
}

function migrateState(raw){
  if(!raw||typeof raw!=='object')return freshState();
  const next={...raw};
  const from=Number.isSafeInteger(next.saveVersion)?next.saveVersion:1;
  if(from<4)next.saveVersion=4;
  if(from<5)next.saveVersion=5;
  return next;
}

function migrateMeta(raw){
  if(!raw||typeof raw!=='object')return freshMeta();
  const next={...raw};
  const from=Number.isSafeInteger(next.saveVersion)?next.saveVersion:1;
  if(from<3&&Array.isArray(next.triviaSeenPro))next.triviaSeenPro={};
  if(from<4&&!Array.isArray(next.sessions))next.sessions=[];
  if(from<5){if(!Number.isFinite(next.volume))next.volume=.65;if(!Number.isSafeInteger(next.cosmeticTokens))next.cosmeticTokens=Object.keys(next.achievements||{}).length*2;}
  next.saveVersion=SAVE_VERSION;
  return next;
}

function validateState(raw){
  const migrated=migrateState(raw);
  if(!Number.isSafeInteger(migrated.balance)||migrated.balance<0||!Array.isArray(migrated.ledger)||!Array.isArray(migrated.history))return freshState();
  return {saveVersion:SAVE_VERSION,balance:migrated.balance,ledger:migrated.ledger,history:migrated.history};
}

function normalizeMeta(raw){
  const result={...freshMeta(),...migrateMeta(raw)};
  if(!result.achievements||typeof result.achievements!=='object')result.achievements={};
  if(!result.flags||typeof result.flags!=='object')result.flags={};
  if(!result.triviaSeenPro||Array.isArray(result.triviaSeenPro)||typeof result.triviaSeenPro!=='object')result.triviaSeenPro={};
  if(!Array.isArray(result.sessions))result.sessions=[];
  if(!['mint','purple','gold'].includes(result.theme))result.theme='mint';
  if(!Number.isFinite(result.volume)||result.volume<0||result.volume>1)result.volume=.65;
  if(!Number.isSafeInteger(result.cosmeticTokens)||result.cosmeticTokens<0)result.cosmeticTokens=0;
  if(!result.cosmetics||typeof result.cosmetics!=='object')result.cosmetics=freshMeta().cosmetics;
  result.cosmetics={...freshMeta().cosmetics,...result.cosmetics};
  if(!Array.isArray(result.cosmetics.owned))result.cosmetics.owned=[];
  if(!result.weekly||typeof result.weekly!=='object')result.weekly=null;
  result.saveVersion=SAVE_VERSION;
  return result;
}

let state=validateState(parseJSON(STATE_KEY,freshState));
let meta=normalizeMeta(parseJSON(META_KEY,freshMeta));

// A stale tab must never silently overwrite a newer browser-local save.
// This is optimistic conflict detection, not an atomic multi-tab database lock.
const persisted={state:localStorage.getItem(STATE_KEY),meta:localStorage.getItem(META_KEY)};
export class StaleSaveError extends Error{
  constructor(){super('NEON VAULT progress changed in another tab. Reload this tab before playing.');this.name='StaleSaveError';}
}
function assertFresh(which){
  const key=which==='state'?STATE_KEY:META_KEY;
  if(localStorage.getItem(key)!==persisted[which])throw new StaleSaveError();
}
const listeners=new Set();
function emit(type,payload={}){listeners.forEach(listener=>listener({type,payload,state,meta}));}

export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function getState(){return state;}
export function getMeta(){return meta;}

export function saveState(){
  assertFresh('state');
  state.saveVersion=SAVE_VERSION;
  const raw=JSON.stringify(state);
  localStorage.setItem(STATE_KEY,raw);
  persisted.state=raw;
  emit('state-saved');
}

export function saveMeta(){
  assertFresh('meta');
  meta.saveVersion=SAVE_VERSION;
  const raw=JSON.stringify(meta);
  localStorage.setItem(META_KEY,raw);
  persisted.meta=raw;
  emit('meta-saved');
}

export function setMeta(patch){meta=normalizeMeta({...meta,...patch});saveMeta();}
export function updateMeta(mutator){mutator(meta);meta=normalizeMeta(meta);saveMeta();}
export function canAfford(cents){return Number.isSafeInteger(cents)&&cents>=0&&state.balance>=cents;}

export function debit(cents,reason='Wager'){
  assertFresh('state');
  if(!Number.isSafeInteger(cents)||cents<0)throw new RangeError('Invalid debit');
  if(state.balance<cents)throw new Error(`Not enough credits for ${reason}`);
  state.balance-=cents;
  saveState();
  emit('wallet-debit',{cents,reason});
}

export function settlementRecord(id){return id?state.history.find(item=>item.settlementId===id)||null:null;}
function checkAmount(value){return Number.isSafeInteger(value)&&value>=0;}
export function settle(game,bet,payout,{quiet=false,metadata={},id}={}){
  assertFresh('state');
  if(id&&settlementRecord(id))return settlementRecord(id);
  if(!checkAmount(bet)||!checkAmount(payout)||!Number.isSafeInteger(state.balance+payout))throw new RangeError('Invalid settlement');
  const at=Date.now(),net=payout-bet;
  state.balance+=payout;
  const record={at,game,bet,payout,net,...metadata};
  if(id)record.settlementId=id;
  state.ledger.push({at,net,game});
  state.history.push(record);
  saveState();
  emit('settled',{record,quiet});
  return record;
}

/** For known-outcome games, wager and payout are committed with one save. */
export function settleWager(game,bet,payout,{quiet=false,metadata={},id}={}){
  assertFresh('state');
  if(id&&settlementRecord(id))return settlementRecord(id);
  if(!checkAmount(bet)||!checkAmount(payout)||bet>state.balance||!Number.isSafeInteger(state.balance-bet+payout))throw new RangeError('Invalid wager settlement');
  const at=Date.now(),net=payout-bet;
  const record={at,game,bet,payout,net,...metadata};
  if(id)record.settlementId=id;
  state.balance+=net;
  state.ledger.push({at,net,game});
  state.history.push(record);
  saveState();
  emit('settled',{record,quiet});
  return record;
}

export function grant(cents,label='Reward'){
  assertFresh('state');
  if(!Number.isSafeInteger(cents)||cents<=0)return null;
  if(!Number.isSafeInteger(state.balance+cents))throw new RangeError('Invalid credit balance');
  const at=Date.now();
  state.balance+=cents;
  const record={at,game:label,bet:0,payout:cents,net:cents};
  state.ledger.push({at,net:cents,game:label});
  state.history.push(record);
  saveState();
  emit('settled',{record,quiet:true});
  return record;
}

export function replaceSave(nextState,nextMeta){
  assertFresh('state');assertFresh('meta');
  state=validateState(nextState);
  meta=normalizeMeta(nextMeta||freshMeta());
  saveState();
  saveMeta();
  emit('save-replaced');
}

export function profitSince(ms){
  const now=Date.now();
  return state.ledger.reduce((sum,item)=>sum+(Number.isFinite(item.at)&&item.at<=now&&item.at>=now-ms?Number(item.net)||0:0),0);
}

export function exportPayload(){return{app:'NEON VAULT',version:SAVE_VERSION,exportedAt:new Date().toISOString(),state,meta};}

export function validateImport(payload){
  const candidate=payload?.state||payload;
  if(!candidate||!Number.isSafeInteger(candidate.balance)||candidate.balance<0||!Array.isArray(candidate.history)||!Array.isArray(candidate.ledger)||candidate.history.length>50000||candidate.ledger.length>50000)throw new Error('Invalid Neon Vault save');
  const validEntry=item=>item&&typeof item==='object'&&typeof item.game==='string'&&item.game.length>0&&item.game.length<=120&&Number.isFinite(item.at)&&item.at>=0&&Number.isSafeInteger(item.net);
  if(!candidate.ledger.every(validEntry))throw new Error('Invalid ledger entries');
  if(!candidate.history.every(item=>validEntry(item)&&checkAmount(item.bet)&&checkAmount(item.payout)&&item.payout-item.bet===item.net))throw new Error('Invalid game history');
  const inputMeta=payload?.meta||freshMeta();
  if(!inputMeta||typeof inputMeta!=='object'||Array.isArray(inputMeta))throw new Error('Invalid player profile');
  return{state:validateState(candidate),meta:normalizeMeta(inputMeta)};
}

export function walletSummary(){return money(state.balance);}
