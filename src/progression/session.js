import {getState,getMeta,saveMeta,subscribe} from '../core/store.js';

const SESSION_KEY='neon-vault-session-v1';

function loadSession(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if(parsed&&Number.isFinite(parsed.startedAt)&&Number.isSafeInteger(parsed.startBalance))return parsed;
  }catch{}
  const fresh={startedAt:Date.now(),startBalance:getState().balance,settled:0,biggestWin:0,biggestLoss:0};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(fresh));
  return fresh;
}

let session=loadSession();

function saveSession(){sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}

export function currentSession(){
  return {
    ...session,
    currentBalance:getState().balance,
    net:getState().balance-session.startBalance,
    durationMs:Math.max(0,Date.now()-session.startedAt)
  };
}

export function finalizeSession(){
  if(!session.settled)return null;
  const finished={...currentSession(),endedAt:Date.now()};
  const meta=getMeta();
  meta.sessions=[...(meta.sessions||[]),finished].slice(-50);
  saveMeta();
  return finished;
}

export function resetSession(){
  session={startedAt:Date.now(),startBalance:getState().balance,settled:0,biggestWin:0,biggestLoss:0};
  saveSession();
}

subscribe(({type,payload})=>{
  if(type!=='settled')return;
  const net=Number(payload.record?.net)||0;
  session.settled++;
  session.biggestWin=Math.max(session.biggestWin,net);
  session.biggestLoss=Math.min(session.biggestLoss,net);
  saveSession();
});

window.addEventListener('pagehide',()=>{
  try{finalizeSession();}catch{}
});
