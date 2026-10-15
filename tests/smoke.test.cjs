'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const required=[
  'index.html','style.css','pro.css','app.js','shoe.js','blackjack-actions.js','blackjack-pro.js',
  'trivia-questions.js','trivia-balanced.js','trivia-pro.js','pro-core.js','games-pro.js','boot.js',
  'navigation-guard.js','README.md'
];
required.forEach(file=>assert.ok(fs.existsSync(path.join(root,file)),`Missing required file: ${file}`));

const index=read('index.html');
['pro.css','pro-core.js','games-pro.js','trivia-pro.js','blackjack-pro.js','boot.js','navigation-guard.js'].forEach(asset=>{
  assert.ok(index.includes(asset),`index.html is not loading ${asset}`);
});
assert.ok(index.includes('VIRTUAL CREDITS ONLY'),'Virtual-credit disclaimer must stay visible');
assert.ok(index.includes('Created by Daniel O\'Keefe'),'Creator credit is missing');

const app=read('app.js');
assert.ok(app.includes('crypto.getRandomValues'),'Game RNG must use crypto.getRandomValues');
assert.ok(!app.includes('Math.random('),'Do not use Math.random for game outcomes');

const blackjack=read('blackjack-pro.js');
['DOUBLE DOWN','SPLIT','SURRENDER','TAKE INSURANCE'].forEach(term=>assert.ok(blackjack.includes(term),`Blackjack action missing: ${term}`));
assert.ok(blackjack.includes("while(total(r.dealer)<17)"),'Dealer must play out hands to 17');

const rouletteSlots=read('games-pro.js');
['dozen1','column1','FREE SPIN','7 PAYLINES'].forEach(term=>assert.ok(rouletteSlots.includes(term),`Enhanced game rule missing: ${term}`));
assert.ok(rouletteSlots.includes('freeSpinBet'),'Free spins must preserve the triggering wager');
assert.ok(rouletteSlots.includes('saveSlotState'),'Free-spin state must persist across navigation/reloads');
assert.ok(rouletteSlots.includes("log('Roulette',bet,payout,{quiet:true})"),'Roulette must settle before its animation finishes');
assert.ok(rouletteSlots.includes("log(game,logBet,payout,{quiet:true})"),'Slots must settle before its animation finishes');

const trivia=read('trivia-balanced.js');
assert.ok(trivia.includes('Exactly 200 questions'),'Balanced trivia pool contract is missing');
const triviaPro=read('trivia-pro.js');
['Geography','Science','Sports','Math','History & Culture','Technology'].forEach(cat=>assert.ok(triviaPro.includes(cat),`Trivia category missing: ${cat}`));
assert.ok(triviaPro.includes('bucketKey(category,difficulty)'),'Trivia no-repeat tracking must be difficulty-aware');

const navGuard=read('navigation-guard.js');
assert.ok(navGuard.includes("round&&view==='blackjack'"),'Active Blackjack navigation guard is missing');
assert.ok(navGuard.includes("trivia&&view==='trivia'&&trivia.pot>0"),'Uncashed Trivia navigation guard is missing');

const pro=read('pro-core.js');
['ACHIEVEMENTS','DAILY CHALLENGE','EXPORT SAVE','IMPORT SAVE','bankroll-chart'].forEach(term=>assert.ok(pro.includes(term),`Professional feature missing: ${term}`));

console.log('NEON VAULT smoke tests passed.');
