'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {pathToFileURL}=require('url');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const required=[
  'index.html','style.css','creator.css','pro.css','mobile.css','README.md','ARCHITECTURE.md',
  'manifest.webmanifest','sw.js','icon.svg','eslint.config.js','prettier.config.js',
  'src/app.js','src/core/utils.js','src/core/random.js','src/core/store.js',
  'src/ui/common.js','src/ui/views.js','src/progression/progression.js','src/progression/session.js','src/data/trivia.js',
  'src/games/blackjack.js','src/games/roulette.js','src/games/slots.js','src/games/dice.js','src/games/trivia.js',
  'tests/rules.test.mjs','tests/e2e/neon-vault.spec.js'
];
required.forEach(file=>assert.ok(fs.existsSync(path.join(root,file)),`Missing required v4 file: ${file}`));

const index=read('index.html');
assert.ok(index.includes('type="module" src="src/app.js"'),'index.html must use the single ES-module entry point');
assert.equal((index.match(/<script/g)||[]).length,1,'index.html should load exactly one script');
assert.ok(index.includes('VIRTUAL CREDITS ONLY'),'Virtual-credit disclaimer must stay visible');
assert.ok(index.includes('Created by Daniel O\'Keefe'),'Creator credit is missing');
assert.ok(index.includes('manifest.webmanifest'),'PWA manifest must be linked');
assert.ok(index.includes('mobile-dock'),'Mobile navigation dock is missing');

const store=read('src/core/store.js');
assert.ok(store.includes("STATE_KEY='neon-vault-save-v1'"),'Legacy wallet/history save key must stay compatible');
assert.ok(store.includes("META_KEY='neon-vault-meta-v2'"),'Legacy progression save key must stay compatible');
assert.ok(store.includes('SAVE_VERSION=4'),'v4 save migration marker is missing');
assert.ok(store.includes('migrateState'),'State migration function is missing');
assert.ok(store.includes('migrateMeta'),'Metadata migration function is missing');
assert.ok(store.includes('function settle('),'Central settlement service is missing');

const random=read('src/core/random.js');
assert.ok(random.includes('crypto.getRandomValues'),'Game RNG must use crypto.getRandomValues');
assert.ok(random.includes('setRandomSourceForTests'),'Deterministic RNG injection hook is missing');
assert.ok(!random.includes('Math.random('),'Do not use Math.random for game outcomes');

const blackjack=read('src/games/blackjack.js');
['DOUBLE DOWN','SPLIT','SURRENDER','TAKE INSURANCE','Perfect Pairs','21+3'].forEach(term=>assert.ok(blackjack.includes(term),`Blackjack rule missing: ${term}`));
assert.ok(blackjack.includes('while(handTotal(r.dealer)<17)'),'Dealer must play out hands to 17');
assert.ok(blackjack.includes('abandon()'),'Blackjack must support explicit forfeit settlement on navigation');

const roulette=read('src/games/roulette.js');
['dozen1','column1','mult:36','roulette-straight-win'].forEach(term=>assert.ok(roulette.includes(term),`Roulette feature missing: ${term}`));

const slots=read('src/games/slots.js');
['7 PAYLINES','freeSpinBet','slot-bonus','Slots · Free Spin'].forEach(term=>assert.ok(slots.includes(term),`Slots feature missing: ${term}`));

const triviaGame=read('src/games/trivia.js');
assert.ok(triviaGame.includes('bucketKey(category,difficulty)'),'Trivia no-repeat tracking must be category/difficulty aware');
assert.ok(triviaGame.includes('10-question streak! Auto-cashed'),'Trivia 10-question auto cash-out is missing');

const progression=read('src/progression/progression.js');
['achievements','dailyChallenge','bankrollPoints','rouletteStraightWin','slotBonus'].forEach(term=>assert.ok(progression.includes(term),`Progression feature missing: ${term}`));

const app=read('src/app.js');
assert.ok(app.includes('const games={blackjack:blackjackGame'),'App must use explicit game registry');
assert.ok(app.includes('blackjackGame.abandon()'),'Router must protect active Blackjack hands');
assert.ok(app.includes('triviaGame.abandon()'),'Router must protect uncashed Trivia pots');
assert.ok(app.includes("view==='games'"),'Mobile Games hub is missing');
assert.ok(app.includes("view==='progress'"),'Mobile Progress hub is missing');
assert.ok(app.includes("navigator.serviceWorker.register('./sw.js')"),'Service worker registration is missing');

const proCss=read('pro.css');
assert.ok(proCss.includes('body.theme-purple'),'Midnight Purple theme rules are missing');
assert.ok(proCss.includes('--nv-bg:#090514'),'Midnight Purple must change core background tokens');
assert.ok(proCss.includes('body.theme-gold'),'High Roller Gold theme rules are missing');

const serviceWorker=read('sw.js');
assert.ok(serviceWorker.includes("const CACHE='neon-vault-v4'"),'v4 service-worker cache is missing');
assert.ok(serviceWorker.includes("'./src/app.js'"),'Service worker must cache the app entry point');

(async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'src/data/trivia.js')).href;
  const trivia=await import(moduleUrl);
  assert.equal(trivia.triviaQuestions.length,200,'Trivia bank must contain exactly 200 questions');
  assert.equal(new Set(trivia.triviaQuestions.map(q=>q.q)).size,200,'Trivia question prompts must be unique');
  ['General','Geography','Science','Sports','Math','History & Culture','Technology'].forEach(category=>assert.ok(trivia.triviaCategories.includes(category),`Trivia category missing: ${category}`));
  console.log('NEON VAULT v4 smoke tests passed.');
})().catch(error=>{console.error(error);process.exit(1);});
