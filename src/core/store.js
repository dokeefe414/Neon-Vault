import {money} from './utils.js';

export const STATE_KEY='neon-vault-save-v1';
export const META_KEY='neon-vault-meta-v2';
export const START_BALANCE=100000;
export const SAVE_VERSION=4;

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
  return next;
}

function migrateMeta(raw){
  if(!raw||typeof raw!=='object')return freshMeta();
  const next={...raw};
  const from=Number.isSafeInteger(next.saveVersion)?next.saveVersion:1;
  if(from<3&&Array.isArray(next.triviaSeenPro))next.triviaSeenPro={};
  if(from<4&&!Array.isArray(next.sessions))next.sessions=[];
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
  result.saveVersion=SAVE_VERSION;
  return result;
}

let state=validateState(parseJSON(STATE_KEY,freshState));
let meta=normalizeMeta(parseJSON(META_KEY,freshMeta));

const listeners=new Set();
function emit(type,payload={}){listeners.forEach(listener=>listener({type,payload,state,meta}));}

export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function getState(){return state;}
export function getMeta(){return meta;}

export function saveState(){
  state.saveVersion=SAVE_VERSION;
  localStorage.setItem(STATE_KEY,JSON.stringify(state));
  emit('state-saved');
}

export function saveMeta(){
  meta.saveVersion=SAVE_VERSION;
  localStorage.setItem(META_KEY,JSON.stringify(meta));
  emit('meta-saved');
}

export function setMeta(patch){meta=normalizeMeta({...meta,...patch});saveMeta();}
export function updateMeta(mutator){mutator(meta);meta=normalizeMeta(meta);saveMeta();}
export function canAfford(cents){return Number.isSafeInteger(cents)&&cents>=0&&state.balance>=cents;}

export function debit(cents,reason='Wager'){
  if(!Number.isSafeInteger(cents)||cents<0)throw new RangeError('Invalid debit');
  if(state.balance<cents)throw new Error(`Not enough credits for ${reason}`);
  state.balance-=cents;
  saveState();
  emit('wallet-debit',{cents,reason});
}

export function settle(game,bet,payout,{quiet=false,metadata={}}={}){
  if(!Number.isSafeInteger(bet)||bet<0||!Number.isSafeInteger(payout)||payout<0)throw new RangeError('Invalid settlement');
  const at=Date.now(),net=payout-bet;
  state.balance+=payout;
  const record={at,game,bet,payout,net,...metadata};
  state.ledger.push({at,net,game});
  state.history.push(record);
  saveState();
  emit('settled',{record,quiet});
  return record;
}

export function grant(cents,label='Reward'){
  if(!Number.isSafeInteger(cents)||cents<=0)return null;
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
  if(!candidate||!Number.isSafeInteger(candidate.balance)||candidate.balance<0||!Array.isArray(candidate.history)||!Array.isArray(candidate.ledger))throw new Error('Invalid Neon Vault save');
  return{state:validateState(candidate),meta:normalizeMeta(payload?.meta||freshMeta())};
}

export function walletSummary(){return money(state.balance);}
