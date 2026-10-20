import {test,expect} from '@playwright/test';
async function clean(page){
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 await expect(page.locator('#pageTitle')).toHaveText('The Vault');
}
async function open(page,name){
 const direct=page.locator(`.nav[data-view="${name}"]:visible,.dock-nav[data-view="${name}"]:visible`).first();
 if(await direct.count()){await direct.click();return;}
 const group=['baccarat','poker','blackjack','slots'].includes(name)?'games':'progress';
 await page.locator(`.dock-nav[data-view="${group}"]:visible`).click();
 await page.locator(`[data-hub-go="${name}"]`).click();
}
async function state(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('neon-vault-save-v1')));}
test('v5.6 Baccarat supports bets and settles once',async({page})=>{
 await clean(page);await open(page,'baccarat');
 await expect(page.locator('#pageTitle')).toHaveText('Baccarat');
 await expect(page.locator('#baccaratBets [data-pick]')).toHaveCount(3);
 await page.locator('#bet').fill('5');
 await page.locator('#baccaratBets [data-pick="player"]').click();
 const before=await state(page);
 await page.locator('#play').click();
 await expect(page.locator('#message .v52-result-banner')).toBeVisible({timeout:7000});
 const after=await state(page);
 expect(after.history.length).toBe(before.history.length+1);
 const entry=after.history.at(-1);
 expect(entry.game).toBe('Baccarat');expect(entry.bet).toBe(500);
 expect(entry.pick).toBe('player');expect(entry.player.length).toBeGreaterThanOrEqual(2);
 expect(entry.banker.length).toBeGreaterThanOrEqual(2);
});
test('v5.6 Video Poker cancel is free and draw settles once',async({page})=>{
 await clean(page);await open(page,'poker');
 await expect(page.locator('#pageTitle')).toHaveText('Video Poker');
 await page.locator('#bet').fill('7');
 await page.locator('#play').click();
 await expect(page.locator('.nv-poker-card')).toHaveCount(5);
 await page.locator('[data-hold="0"]').click();
 await expect(page.locator('[data-hold="0"]')).toHaveAttribute('aria-pressed','true');
 let before=await state(page);
 await page.locator('#pokerCancel').click();
 expect((await state(page)).balance).toBe(before.balance);
 await page.locator('#play').click();
 before=await state(page);
 await page.locator('#pokerDraw').click();
 await expect(page.locator('#message .v52-result-banner')).toBeVisible();
 const after=await state(page),entry=after.history.at(-1);
 expect(after.history.length).toBe(before.history.length+1);
 expect(entry.game).toBe('Video Poker');
 expect(entry.bet).toBe(700);
 expect(entry.initial).toHaveLength(5);
 expect(entry.final).toHaveLength(5);
});
test('v5.5 records show both new games and replay details',async({page})=>{
 await clean(page);await open(page,'baccarat');
 await page.locator('#bet').fill('5');await page.locator('#play').click();
 await expect(page.locator('#message .v52-result-banner')).toBeVisible({timeout:7000});
 await open(page,'records');
 await expect(page.locator('#pageTitle')).toHaveText('Game Records');
 await expect(page.locator('#recordList')).toContainText('Baccarat');
 await page.locator('[data-record="0"]').click();
 await expect(page.locator('#recordDetail')).toContainText('Baccarat deal');
});
test('v5.7 expanded cosmetics and achievements render on desktop and mobile',async({page})=>{
 await clean(page);
 await open(page,'profile');
 await page.locator('#editIdentity').click();
 await expect(page.locator('.v5-avatar-button')).toHaveCount(22);
 await expect(page.locator('[data-item="card-neon"]')).toBeVisible();
 await expect(page.locator('[data-item="felt-midnight"]')).toBeVisible();
 await open(page,'achievements');
 await expect(page.locator('#content')).toContainText('Baccarat Beginner');
 await expect(page.locator('#content')).toContainText('Royal Treatment');
});
test('v5.5 profile opens game records',async({page})=>{
 await clean(page);await open(page,'profile');
 await page.locator('#profileRecords').click();
 await expect(page.locator('#pageTitle')).toHaveText('Game Records');
});
