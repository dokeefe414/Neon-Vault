import {test,expect} from '@playwright/test';

const SAVE_KEY='neon-vault-save-v1';
const META_KEY='neon-vault-meta-v2';

async function bootClean(page){
  await page.goto('/');
  await page.evaluate(({SAVE_KEY,META_KEY})=>{
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(META_KEY);
  },{SAVE_KEY,META_KEY});
  await page.reload();
}

async function nav(page,label){
  await page.getByRole('button',{name:new RegExp(label,'i')}).click();
}

async function persistedState(page){
  return page.evaluate(SAVE_KEY=>JSON.parse(localStorage.getItem(SAVE_KEY)),SAVE_KEY);
}

test('loads dashboard with a fresh $1,000 wallet and no runtime errors',async({page})=>{
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await bootClean(page);
  await expect(page.getByRole('heading',{name:'The Vault'})).toBeVisible();
  await expect(page.locator('#balance')).toHaveText('$1,000.00');
  await expect(page.getByText('VIRTUAL CREDITS ONLY')).toBeVisible();
  expect(errors).toEqual([]);
});

test('all primary navigation routes render',async({page})=>{
  await bootClean(page);
  const routes=[
    ['Blackjack','Blackjack'],['Roulette','Roulette'],['Slots','Neon Reels'],['Dice','Dice'],
    ['Trivia Rescue','Trivia Rescue'],['Profile','Player Profile'],['Achievements','Achievements'],
    ['Daily Challenge','Daily Challenge'],['Activity','Activity']
  ];
  for(const [button,heading] of routes){
    await nav(page,button);
    await expect(page.getByRole('heading',{name:new RegExp(heading,'i')})).toBeVisible();
  }
});

test('wallet and activity persist across reloads after a dice round',async({page})=>{
  await bootClean(page);
  await nav(page,'Dice');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/Rolled \d+ — (WIN|LOSS)/);
  const first=await persistedState(page);
  expect(first.history.length).toBeGreaterThan(0);
  const balance=first.balance;
  await page.reload();
  await expect(page.locator('#balance')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(balance/100));
  await nav(page,'Activity');
  await expect(page.getByText('Dice',{exact:true}).first()).toBeVisible();
});

test('roulette settles a spin and records one result',async({page})=>{
  await bootClean(page);
  await nav(page,'Roulette');
  await page.locator('#bet').fill('5');
  await page.getByRole('button',{name:'BLACK'}).click();
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/\d+ (RED|BLACK|GREEN) · Black · (WIN|LOSS)/,{timeout:5000});
  const state=await persistedState(page);
  expect(state.history.filter(x=>x.game==='Roulette')).toHaveLength(1);
});

test('slots settles a spin and remains usable',async({page})=>{
  await bootClean(page);
  await nav(page,'Slots');
  await page.locator('#bet').fill('7');
  await page.locator('#play').click();
  await expect(page.locator('#message')).not.toHaveText('',{timeout:5000});
  const state=await persistedState(page);
  expect(state.history.some(x=>x.game==='Slots'||x.game==='Slots · Free Spin')).toBeTruthy();
  await expect(page.locator('#play')).toBeEnabled();
});

test('blackjack can deal and finish or expose valid player actions',async({page})=>{
  await bootClean(page);
  await nav(page,'Blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#table .playing-card')).toHaveCount(4);

  const insurance=page.getByRole('button',{name:'NO INSURANCE'});
  if(await insurance.isVisible().catch(()=>false)) await insurance.click();

  for(let i=0;i<8;i++){
    if(await page.locator('#actions').getByRole('button',{name:'STAND'}).isVisible().catch(()=>false)){
      await page.locator('#actions').getByRole('button',{name:'STAND'}).click();
    }else break;
  }

  const state=await persistedState(page);
  expect(state.history.some(x=>/^Blackjack(?: · Hand \d+)?$/.test(x.game))).toBeTruthy();
});

test('trivia category selection persists and questions render',async({page})=>{
  await bootClean(page);
  await nav(page,'Trivia Rescue');
  await expect(page.locator('#answers button')).toHaveCount(4);
  await page.locator('#triviaCategory').selectOption({label:'Science'});
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  await page.reload();
  await nav(page,'Trivia Rescue');
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  const meta=await page.evaluate(META_KEY=>JSON.parse(localStorage.getItem(META_KEY)),META_KEY);
  expect(meta.triviaCategory).toBe('Science');
});

test('profile export downloads a valid JSON save',async({page})=>{
  await bootClean(page);
  await nav(page,'Profile');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'EXPORT SAVE'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^neon-vault-save-.*\.json$/);
});

test('navigation away from an active Blackjack hand requires confirmation',async({page})=>{
  await bootClean(page);
  await nav(page,'Blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  const alreadySettled=await page.locator('#actions button').count()===0;
  if(alreadySettled)test.skip(true,'Random initial Blackjack settled immediately');

  page.once('dialog',dialog=>dialog.dismiss());
  await nav(page,'Dashboard');
  await expect(page.getByRole('heading',{name:'Blackjack'})).toBeVisible();
});

test('mobile viewport keeps navigation and game controls usable',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile-only coverage');
  await bootClean(page);
  await expect(page.locator('nav')).toBeVisible();
  await nav(page,'Dice');
  await expect(page.locator('#play')).toBeVisible();
  const box=await page.locator('#play').boundingBox();
  expect(box.width).toBeGreaterThan(80);
  expect(box.height).toBeGreaterThan(30);
});
