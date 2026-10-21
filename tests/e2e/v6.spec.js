import {test,expect} from '@playwright/test';
test('Online Vault opens as a separate account-mode without touching guest wallet',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 const balance=await page.locator('#balance').textContent();
 const nav=page.locator('.nav[data-view="cloud"]:visible');
 if(await nav.count())await nav.click();
 else await page.locator('.dock-nav[data-view="cloud"]:visible').click();
 await expect(page.locator('#pageTitle')).toHaveText('Online Vault');
 await expect(page.locator('.cloud-setup')).toBeVisible();
 await expect(page.locator('#balance')).toHaveText(balance);
 await expect(page.locator('#cloudOrigin')).toHaveAttribute('type','url');
 await expect(page.locator('#content')).toContainText('Guest');
});
test('Offline guest casino remains accessible from Online Vault without configuring an API',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await page.reload();
 const nav=page.locator('.nav[data-view="cloud"]:visible');
 if(await nav.count())await nav.click();
 else await page.locator('.dock-nav[data-view="cloud"]:visible').click();
 const guest=page.locator('.nav[data-view="dice"]:visible');
 if(await guest.count())await guest.click();
 else{
  await page.locator('.dock-nav[data-view="games"]:visible').click();
  await page.locator('[data-hub-go="dice"]').click();
 }
 await expect(page.locator('#pageTitle')).toHaveText('Dice');
 await expect(page.locator('#play')).toBeVisible();
});
