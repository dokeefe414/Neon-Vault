import {$,money,escapeHtml} from '../core/utils.js';
import {getMeta} from '../core/store.js';
import {prestigeStatus,prestigeMilestones,claimPrestige,claimDailyStyleReward,rewardState,gameplayInsights} from '../progression/rewards.js';
import {toast} from './common.js';
export function renderPrestige(navigate){
 const meta=getMeta(),claims=rewardState(meta),rank=prestigeStatus(meta);
 const isClaimed=claims.daily===new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0');
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">NEON VAULT · PRESTIGE</div><h2>Milestones & rewards</h2><p class="hint">Earn purely cosmetic style tokens and frames. Daily claims are optional, with no streak requirement, deadline pressure, or real-money value.</p>
 <div class="pro-panel"><h3>Daily style gift</h3><p class="hint">Claim +2 style tokens once per local calendar day. Skipping days does not affect future gifts.</p><button class="primary" id="dailyStyleGift" ${isClaimed?'disabled':''}>${isClaimed?'CLAIMED TODAY':'CLAIM +2 STYLE TOKENS'}</button></div><div class="v5-identity pro-panel"><div class="v5-avatar">${escapeHtml(meta.cosmetics?.avatar||'◆')}</div><div><div class="pro-kicker">YOUR LIFETIME RANK</div><h3>${escapeHtml(rank.rank)}</h3><p class="hint">${rank.xp} XP · ${Number(meta.cosmeticTokens)||0} style tokens${rank.next?` · Next: ${rank.next.xp} XP`:''}</p></div></div>
 
 <div class="v5-weekly-grid">${prestigeMilestones.map(item=>{const eligible=rank.xp>=item.xp,claimed=!!claims.prestige[item.id];return `<article class="pro-panel"><div class="pro-kicker">${item.xp} XP REQUIRED</div><h3>${escapeHtml(item.title)}</h3><p class="hint">+${item.tokens} tokens and a ${escapeHtml(item.frame)} avatar frame</p><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,rank.xp/item.xp*100)}%"></div></div><button class="secondary" data-prestige="${item.id}" ${!eligible||claimed?'disabled':''}>${claimed?'CLAIMED':eligible?'CLAIM REWARD':'LOCKED'}</button></article>`;}).join('')}</div>
 <button class="secondary" id="goWardrobeFromRewards">OPEN STYLE LOUNGE →</button></section>`;
 $('dailyStyleGift').onclick=()=>{if(claimDailyStyleReward()){toast('Daily cosmetic gift claimed: +2 tokens','unlock');renderPrestige(navigate);}};
 document.querySelectorAll('[data-prestige]').forEach(b=>b.onclick=()=>{if(claimPrestige(b.dataset.prestige)){toast('Prestige frame and tokens unlocked','unlock');renderPrestige(navigate);}});
 $('goWardrobeFromRewards').onclick=()=>navigate('wardrobe');
}
export function renderDetailedInsights(){
 const insights=gameplayInsights(),meta=getMeta(),rows=Object.entries(insights.byGame);
 $('content').innerHTML=`<section class="v5-page"><div class="v5-kicker">PLAYER ANALYTICS · 2.0</div><h2>Advanced performance</h2><p class="hint">Observed results from this browser's saved history only. Short samples and bonus rounds can distort observed return. These figures are not guaranteed or theoretical win rates.</p>
 <div class="v5-metrics">${[['PAID ROUNDS',insights.paidRounds],['TOTAL WAGERED',money(insights.totalBet)],['TOTAL RETURNED',money(insights.totalPaid)],['OBSERVED RETURN',insights.observedReturn===null?'N/A':(insights.observedReturn*100).toFixed(1)+'%'],['SLOTS BONUS TRIGGERS',insights.slotBonusTriggers],['SLOTS FREE SPINS',insights.slotBonusSpins]].map(([name,value])=>`<article class="pro-panel"><div class="pro-kicker">${name}</div><div class="v5-metric-value">${value}</div></article>`).join('')}</div>
 <div class="pro-panel"><h3>Performance by game</h3><div class="v5-game-metrics">${rows.map(([name,g])=>`<div class="v5-game-metric"><strong>${escapeHtml(name)}</strong><span>${g.plays} results</span><span>${g.wagered?((g.returned/g.wagered)*100).toFixed(1)+'% observed return':'Free result'}</span><strong class="${g.net>=0?'positive':'negative'}">${money(g.net)}</strong></div>`).join('')||'<p class="hint">No settled casino results yet.</p>'}</div></div>
 <div class="pro-panel"><h3>Video Poker hand distribution</h3><div class="nv-paytable">${Object.entries(insights.pokerResults).map(([hand,count])=>`<span>${escapeHtml(hand)}</span><strong>${count}</strong>`).join('')||'<p class="hint">Complete a Video Poker draw to see hands here.</p>'}</div></div>
 <div class="pro-panel"><h3>Player progression</h3><p>${Number(meta.xp)||0} XP earned · ${Object.keys(meta.achievements||{}).length} achievements · ${Number(meta.cosmeticTokens)||0} style tokens</p></div></section>`;
}
