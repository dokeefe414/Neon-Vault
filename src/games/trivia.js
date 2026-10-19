import {$,money,escapeHtml} from '../core/utils.js';
import {shuffle} from '../core/random.js';
import {getState,getMeta,saveMeta,settle} from '../core/store.js';
import {renderWallet,toast} from '../ui/common.js';
import {signal} from '../progression/progression.js';
import {triviaQuestions,triviaCategories,triviaCategoryCounts} from '../data/trivia.js';
import {selectTriviaRun,categoryProgress} from './trivia-selection.js';

export class TriviaGame{
  constructor(){this.run=null;}
  hasActiveRound(){return !!this.run&&this.run.pot>0;}
  pool(category){return category==='General'?triviaQuestions:triviaQuestions.filter(q=>q.category===category);}
  newRun(){
    const meta=getMeta();
    const category=triviaCategories.includes(meta.triviaCategory)?meta.triviaCategory:'General';
    const questions=selectTriviaRun(meta,category,this.pool(category),shuffle,10);
    saveMeta();
    this.run={questions,index:0,streak:0,pot:0,locked:false,startedBroke:getState().balance===0,category};
  }
  render(){
    renderWallet();if(!this.run)this.newRun();
    const r=this.run,q=r.questions[r.index],next=r.streak===0?1000:r.pot*2;
    const progress=categoryProgress(getMeta(),r.category,this.pool(r.category));
    $('content').innerHTML=`<div class="game-panel" style="max-width:960px"><div class="trivia-topbar"><div><span class="pill">BANKROLL RESCUE</span><h2 style="margin:14px 0 5px">Trivia Rescue</h2><p style="margin-top:0">Now with ${triviaCategoryCounts[r.category]} unique questions in this selection, including varied difficulty and a full no-repeat cycle.</p></div><div><label class="pro-kicker" for="triviaCategory">CATEGORY</label><select id="triviaCategory" style="display:block;margin-top:6px">${triviaCategories.map(cat=>`<option value="${escapeHtml(cat)}" ${cat===r.category?'selected':''}>${escapeHtml(cat)} (${triviaCategoryCounts[cat]})</option>`).join('')}</select></div></div><div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:24px"><div class="stat"><label>STREAK</label><strong>${r.streak}/10</strong></div><div class="stat"><label>CASH-OUT POT</label><strong class="${r.pot?'positive':''}">${money(r.pot)}</strong></div><div class="stat"><label>NEXT CORRECT</label><strong>${money(next)}</strong></div></div><div class="felt" style="text-align:left"><div class="level-row"><div class="eyebrow">QUESTION ${r.index+1} OF 10 · ${r.category.toUpperCase()}</div><span class="difficulty ${q.difficulty}">${q.difficulty}</span></div><h2 style="margin:14px 0 22px">${escapeHtml(q.q)}</h2><div id="answers" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${q.a.map((answer,i)=>`<button class="secondary" data-answer="${i}" style="text-align:left;padding:16px">${String.fromCharCode(65+i)}. ${escapeHtml(answer)}</button>`).join('')}</div></div><div id="message" class="result"></div><div class="controls"><button class="primary" id="cashout" ${r.pot===0?'disabled style="opacity:.45;cursor:not-allowed"':''}>CASH OUT ${money(r.pot)}</button><button class="secondary" id="restartTrivia">NEW QUESTION RUN</button></div><p class="hint"><strong id="triviaPoolSummary">${progress.remaining} unseen of ${progress.total} in this category's current cycle.</strong> All questions are drawn without repeating until the category pool is exhausted; answer positions shuffle every run. Trivia rewards are virtual credits only.</p></div>`;
    document.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>this.answer(Number(btn.dataset.answer)));
    $('cashout').onclick=()=>this.cashout(false);
    $('restartTrivia').onclick=()=>{if(r.pot>0&&!confirm('Start over and lose the current uncashed trivia pot?'))return;this.newRun();this.render();};
    $('triviaCategory').onchange=e=>{
      if(r.pot>0&&!confirm('Changing category starts a new run and loses the current uncashed pot. Continue?')){e.target.value=r.category;return;}
      const meta=getMeta();meta.triviaCategory=e.target.value;saveMeta();this.run=null;this.render();
    };
  }
  answer(choice){
    const r=this.run;if(!r||r.locked)return;r.locked=true;
    const q=r.questions[r.index];
    if(choice===q.c){
      r.streak++;r.pot=r.streak===1?1000:r.pot*2;signal('trivia-correct');toast(`Correct! Trivia pot: ${money(r.pot)}`,'win');
      if(r.streak>=10){this.cashout(true);return;}
      r.index++;r.locked=false;this.render();return;
    }
    const lost=r.pot;r.pot=0;r.streak=0;
    $('message').innerHTML=`Wrong. The correct answer was <strong>${escapeHtml(q.a[q.c])}</strong>. ${lost?`Your uncashed ${money(lost)} streak pot was lost.`:'Start a new streak on the next question.'}`;
    document.querySelectorAll('[data-answer]').forEach(btn=>btn.disabled=true);
    $('cashout').disabled=true;
    const next=document.createElement('button');next.className='primary';next.textContent='NEXT QUESTION →';next.onclick=()=>{this.newRun();this.render();};$('cashout').parentElement.appendChild(next);toast('Wrong answer — streak reset','loss');
  }
  cashout(auto){
    const r=this.run;if(!r||r.pot<=0)return;
    const payout=r.pot,streak=r.streak,comeback=r.startedBroke;
    settle(`Trivia (${streak} streak)`,0,payout,{quiet:true,metadata:{category:r.category,streak}});
    if(comeback)signal('trivia-comeback');
    toast(`${auto?'10-question streak! Auto-cashed':'Trivia cashed out'} ${money(payout)}`,'win');
    this.run=null;renderWallet();this.render();
  }
  abandon(){this.run=null;}
}

export const triviaGame=new TriviaGame();
