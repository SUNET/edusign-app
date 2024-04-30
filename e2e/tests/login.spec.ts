
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://dev.edusign.sunet.se/');
  await expect(page.locator('#main-title')).toContainText('eduSign - Secure digital signature');
  await expect(page.locator('#edusign-logo').getByRole('img')).toBeVisible();
  await page.frameLocator('iframe[title="SeamlessAccess Button"]').getByRole('button', { name: 'Access through your' }).click();
  await page.getByLabel('Find your institution,').click();
  await page.getByLabel('Find your institution,').fill('eduid');
  await page.getByLabel('Find your institution,').press('Enter');
  await page.locator('a').filter({ hasText: 'eduID Sweden eduid.se' }).click();
  await page.getByPlaceholder('email or username').fill('enrique+4@cazalla.net');
  await page.getByPlaceholder('enter password').fill('');
  await page.getByPlaceholder('enter password').fill('8pwr 3331 qwzl');
  await page.getByRole('button', { name: 'Log in' }).click();
  //await page.getByRole('button', { name: 'Use my security key' }).click();
  //await page.goto('https://dev.edusign.sunet.se/sign/');
  await expect(page.getByTestId('edusign-logo').getByRole('img')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#dnd-message-head-lg')).toContainText('Drag and drop files to be signed hereorclick here to choose files to be signed');
});
