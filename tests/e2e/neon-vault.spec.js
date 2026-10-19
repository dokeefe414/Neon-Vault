import {test,expect} from '@playwright/test';

const SAVE_KEY='neon-vault-save-v1';
const META_KEY='neon-vault-meta-v2';
const BLACKJACK_KEY='neon-vault-blackjack-round-v1';

async function bootClean(page){
  await page.goto('/');
  await page.evaluate(({SAVE_KEY,META_KEY,BLACKJACK_KEY})=>{
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(BLACKJACK_KEY);
    sessionStorage.clear();
  },{SAVE_KEY,META_KEY,BLACKJACK_KEY});
  await page.reload();
}

async function nav(page,view){
  const direct=page.locator(`button.nav[data-view="${view}"]:visible,button.dock-nav[data-view="${view}"]:visible`).first();
  if(await direct.count()){await direct.click({timeout:7000});return;}
  if(['blackjack','roulette','slots','dice'].includes(view)){
    await page.locator('button.dock-nav[data-view="games"]:visible').click({timeout:7000});
    await page.locator(`button[data-hub-go="${view}"]`).click({timeout:7000});
    return;
  }
  if(['achievements','challenges','history'].includes(view)){
    await page.locator('button.dock-nav[data-view="progress"]:visible').click({timeout:7000});
    await page.locator(`button[data-hub-go="${view}"]`).click({timeout:7000});
    return;
  }
  throw new Error(`No visible navigation path for ${view}`);
}

async function persistedState(page){return page.evaluate(SAVE_KEY=>JSON.parse(localStorage.getItem(SAVE_KEY)),SAVE_KEY);}

test('loads dashboard with a fresh $1,000 wallet and no runtime errors',async({page})=>{
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await bootClean(page);
  await expect(page.locator('#pageTitle')).toHaveText('The Vault');
  await expect(page.locator('#balance')).toHaveText('$1,000.00');
  await expect(page.locator('body')).not.toContainText('Something went wrong');
  expect(errors).toEqual([]);
});

test('all primary navigation routes render',async({page})=>{
  test.setTimeout(60_000);
  await bootClean(page);
  const routes=[['blackjack','Blackjack'],['roulette','Roulette'],['slots','Slots'],['dice','Dice'],['trivia','Trivia Rescue'],['profile','Player Profile'],['achievements','Achievements'],['challenges','Daily Challenge'],['history','Activity']];
  for(const [view,title] of routes){
    await test.step(`navigate to ${view}`,async()=>{
      await nav(page,view);
      await expect(page.locator('#pageTitle')).toHaveText(title);
      await expect(page.locator('#content')).not.toContainText('Something went wrong');
    });
  }
});

test('wallet and activity persist across reloads after a dice round',async({page})=>{
  await bootClean(page);
  await nav(page,'dice');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/Rolled \d+ — (WIN|LOSS)/);
  const first=await persistedState(page);
  expect(first.history.length).toBeGreaterThan(0);
  expect(first.saveVersion).toBe(5);
  const balance=first.balance;
  await page.reload();
  await expect(page.locator('#balance')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(balance/100));
  await nav(page,'history');
  await expect(page.locator('.history-table')).toContainText('Dice');
});

test('roulette settles a spin and records one result',async({page})=>{
  await bootClean(page);
  await nav(page,'roulette');
  await page.locator('#bet').fill('5');
  await page.locator('button[data-type="black"]').click();
  await page.locator('#play').click();
  await expect(page.locator('#message')).toContainText(/\d+ (RED|BLACK|GREEN)/,{timeout:5000});
  await expect(page.locator('#message')).toContainText(/WIN|LOSS/);
  const state=await persistedState(page);
  expect(state.history.filter(x=>x.game==='Roulette')).toHaveLength(1);
});

test('slots settles a spin and remains usable',async({page})=>{
  await bootClean(page);
  await nav(page,'slots');
  await page.locator('#bet').fill('7');
  await page.locator('#play').click();
  await expect(page.locator('#message')).not.toHaveText('',{timeout:5000});
  const state=await persistedState(page);
  expect(state.history.some(x=>x.game==='Slots'||x.game==='Slots · Free Spin')).toBeTruthy();
  await expect(page.locator('#play')).toBeEnabled();
});

test('blackjack can deal and finish a hand',async({page})=>{
  await bootClean(page);
  await nav(page,'blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  await expect(page.locator('#table .playing-card')).toHaveCount(4);
  const insurance=page.locator('#declineInsurance');
  if(await insurance.isVisible().catch(()=>false))await insurance.click();
  for(let i=0;i<8;i++){
    const stand=page.locator('#stand');
    if(await stand.isVisible().catch(()=>false))await stand.click();else break;
  }
  const state=await persistedState(page);
  expect(state.history.some(x=>/^Blackjack(?: · Hand \d+)?$/.test(x.game))).toBeTruthy();
});

test('active Blackjack round survives reload without a second debit',async({page})=>{
  await bootClean(page);
  await nav(page,'blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  const insurance=page.locator('#declineInsurance');
  if(await insurance.isVisible().catch(()=>false))await insurance.click();
  const active=await page.locator('#actions button').count()>0;
  if(!active)test.skip(true,'Random initial Blackjack settled immediately');
  const before=await persistedState(page);
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),BLACKJACK_KEY);
  expect(stored?.hands?.length).toBeGreaterThan(0);
  await page.reload();
  await nav(page,'blackjack');
  await expect(page.locator('#message')).toContainText('Restored active hand');
  const after=await persistedState(page);
  expect(after.balance).toBe(before.balance);
  const stand=page.locator('#stand');
  if(await stand.isVisible().catch(()=>false))await stand.click();
});

test('trivia category selection persists and questions render',async({page})=>{
  await bootClean(page);
  await nav(page,'trivia');
  await expect(page.locator('#answers button')).toHaveCount(4);
  await page.locator('#triviaCategory').selectOption({value:'Science'});
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  await page.reload();
  await nav(page,'trivia');
  await expect(page.locator('#triviaCategory')).toHaveValue('Science');
  const meta=await page.evaluate(META_KEY=>JSON.parse(localStorage.getItem(META_KEY)),META_KEY);
  expect(meta.triviaCategory).toBe('Science');
});

test('Midnight Purple changes the full visual theme and persists',async({page})=>{
  await bootClean(page);
  await page.evaluate(META_KEY=>{
    const meta=JSON.parse(localStorage.getItem(META_KEY));
    meta.xp=500;
    meta.theme='mint';
    localStorage.setItem(META_KEY,JSON.stringify(meta));
  },META_KEY);
  await page.reload();
  const mint=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--nv-bg').trim());
  await nav(page,'profile');
  await page.locator('#themeSelect').selectOption('purple');
  await expect(page.locator('body')).toHaveClass(/theme-purple/);
  const purple=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--nv-bg').trim());
  expect(purple).not.toBe(mint);
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/theme-purple/);
});

test('profile export downloads a JSON save',async({page})=>{
  await bootClean(page);
  await nav(page,'profile');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportSave').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^neon-vault-save-.*\.json$/);
});

test('navigation away from an active Blackjack hand requires confirmation',async({page})=>{
  await bootClean(page);
  await nav(page,'blackjack');
  await page.locator('#bet').fill('10');
  await page.locator('#play').click();
  const insurance=page.locator('#declineInsurance');
  if(await insurance.isVisible().catch(()=>false))await insurance.click();
  const active=await page.locator('#actions button').count()>0;
  if(!active)test.skip(true,'Random initial Blackjack settled immediately');
  page.once('dialog',dialog=>dialog.dismiss());
  await nav(page,'home');
  await expect(page.locator('#pageTitle')).toHaveText('Blackjack');
});

test('PWA manifest and service worker are available',async({page,request})=>{
  await bootClean(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','manifest.webmanifest');
  const manifest=await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const data=await manifest.json();
  expect(data.name).toBe('NEON VAULT');
  const sw=await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
});

test('mobile viewport exposes Games and Progress hubs with large touch controls',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile-only coverage');
  await bootClean(page);
  await expect(page.locator('.mobile-dock')).toBeVisible();
  await page.locator('.dock-nav[data-view="games"]').click();
  await expect(page.locator('button[data-hub-go="roulette"]')).toBeVisible();
  await page.locator('button[data-hub-go="roulette"]').click();
  await expect(page.locator('#play')).toBeVisible();
  const box=await page.locator('#play').boundingBox();
  expect(box.width).toBeGreaterThan(80);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await page.locator('.dock-nav[data-view="progress"]').click();
  await expect(page.locator('button[data-hub-go="achievements"]')).toBeVisible();
});
