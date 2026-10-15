import {money} from './utils.js';

export const STATE_KEY='neon-vault-save-v1';
export const META_KEY='neon-vault-meta-v2';
export const START_BALANCE=100000;

const freshState=()=>({balance:START_BALANCE,ledger:[],history:[]});
const freshMeta=()=>({
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

function validateState(raw){
  if(!raw||!Number.isSafeInteger(raw.balance)||raw.balance<0||!Array.isArray(raw.ledger)||!Array.isArray(raw.history)) return freshState();
  return {balance:raw.balance,ledger:raw.ledger,history:raw.history};
}

let state=validateState(parseJSON(STATE_KEY,freshState));
let meta={...freshMeta(),...parseJSON(META_KEY,freshMeta)};
if(!meta.achievements||typeof meta.achievements!=='object') meta.achievements={};
if(!meta.flags||typeof meta.flags!=='object') meta.flags={};
if(!meta.triviaSeenPro||Array.isArray(meta.triviaSeenPro)) meta.triviaSeenPro={};

const listeners=new Set();
function emit(type,payload={}){
  listeners.forEach(listener=>listener({type,payload,state,meta}));
}

export function subscribe(listener){ listeners.add(listener); return ()=>listeners.delete(listener); }
export function getState(){ return state; }
export function getMeta(){ return meta; }

export function saveState(){
  localStorage.setItem(STATE_KEY,JSON.stringify(state));
  emit('state-saved');
}

export function saveMeta(){
  localStorage.setItem(META_KEY,JSON.stringify(meta));
  emit('meta-saved');
}

export function setMeta(patch){
  meta={...meta,...patch};
  saveMeta();
}

export function updateMeta(mutator){
  mutator(meta);
  saveMeta();
}

export function canAfford(cents){ return Number.isSafeInteger(cents)&&cents>=0&&state.balance>=cents; }

export function debit(cents,reason='Wager'){
  if(!Number.isSafeInteger(cents)||cents<0) throw new RangeError('Invalid debit');
  if(state.balance<cents) throw new Error(`Not enough credits for ${reason}`);
  state.balance-=cents;
  saveState();
  emit('wallet-debit',{cents,reason});
}

export function settle(game,bet,payout,{quiet=false,metadata={}}={}){
  if(!Number.isSafeInteger(bet)||bet<0||!Number.isSafeInteger(payout)||payout<0) throw new RangeError('Invalid settlement');
  const at=Date.now();
  const net=payout-bet;
  state.balance+=payout;
  const record={at,game,bet,payout,net,...metadata};
  state.ledger.push({at,net,game});
  state.history.push(record);
  saveState();
  emit('settled',{record,quiet});
  return record;
}

export function grant(cents,label='Reward'){
  if(!Number.isSafeInteger(cents)||cents<=0) return null;
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
  meta={...freshMeta(),...(nextMeta||{})};
  if(!meta.achievements||typeof meta.achievements!=='object') meta.achievements={};
  if(!meta.flags||typeof meta.flags!=='object') meta.flags={};
  if(!meta.triviaSeenPro||Array.isArray(meta.triviaSeenPro)) meta.triviaSeenPro={};
  saveState();
  saveMeta();
  emit('save-replaced');
}

export function profitSince(ms){
  const now=Date.now();
  return state.ledger.reduce((sum,item)=>sum+(Number.isFinite(item.at)&&item.at<=now&&item.at>=now-ms?Number(item.net)||0:0),0);
}

export function exportPayload(){
  return {app:'NEON VAULT',version:3,exportedAt:new Date().toISOString(),state,meta};
}

export function validateImport(payload){
  const candidate=payload?.state||payload;
  if(!candidate||!Number.isSafeInteger(candidate.balance)||candidate.balance<0||!Array.isArray(candidate.history)||!Array.isArray(candidate.ledger)) throw new Error('Invalid Neon Vault save');
  return {state:candidate,meta:payload?.meta||freshMeta()};
}

export function walletSummary(){ return money(state.balance); }
