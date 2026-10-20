import {test,expect} from '@playwright/test';
async function go(page,view){
 const direct=page.locator(`.nav[data-view="${view}"]:visible`);
 if(await direct.count()){await direct.click();return;}
 await page.locator('.dock-nav[data-view="progress"]').click();
 await page.locator(`[data-hub-go="${view}"]`).click();
}
test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 await expect(page.locator('#pageTitle')).toHaveText('The Vault');
});
test('prestige daily cosmetic gift is claimable once and survives reload',async({page})=>{
 await go(page,'rewards');await expect(page.locator('#pageTitle')).toHaveText('Prestige & Rewards');
 await page.locator('#dailyStyleGift').click();
 await expect(page.locator('#dailyStyleGift')).toBeDisabled();
 await expect(page.locator('#content')).toContainText('2 style tokens');
 await page.reload();await go(page,'rewards');
 await expect(page.locator('#dailyStyleGift')).toBeDisabled();
});
test('advanced insights opens with empty history',async({page})=>{
 await go(page,'insights');
 await expect(page.locator('#pageTitle')).toHaveText('Advanced Insights');
 await expect(page.locator('#content')).toContainText('OBSERVED RETURN');
 await expect(page.locator('#content')).toContainText('N/A');
});
test('v5.9 frames and new cosmetics are listed',async({page})=>{
 if(await page.locator('.nav[data-view="wardrobe"]:visible').count())await page.locator('.nav[data-view="wardrobe"]:visible').click();
 else{await page.locator('.dock-nav[data-view="profile"]').click();await page.locator('#editIdentity').click();}
 await expect(page.locator('#content')).toContainText('Sapphire Table');
 await expect(page.locator('#content')).toContainText('Aurora Card Back');
 await expect(page.locator('[data-frame="diamond"]')).toBeDisabled();
});
