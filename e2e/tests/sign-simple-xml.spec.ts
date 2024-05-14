
import * as path from 'path';
import { test, expect } from '@playwright/test';

test('Sign one test PDF document', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  const withKey = process.env.USER1_SECURITY_KEY === "True";

  await page.goto('/sign');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/simple.xml'));

  await expect(page.locator('[id="local-doc-simple\\.xml"]')).toContainText('simple.xml');
  await page.getByTestId('button-forced-preview-simple.xml').click();
  await expect(page.locator('pre')).toContainText('1<test>helloóöo</test>');
  await page.getByTestId('preview-button-confirm-0').click();
  await page.getByTestId('button-sign').click();
  await page.getByPlaceholder('enter password').fill(process.env.USER1_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (withKey) {
    await page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(page.locator('[id="local-doc-simple\\.xml"]')).toContainText('Signed by:Enrique Pérez <enrique+5@cazalla.net>.');
  await page.getByRole('button', { name: 'Other options' }).click();
  await page.getByTestId('menu-item-preview-simple.xml').click();
  await expect(page.locator('pre')).toContainText('<ds:SignedInfo>');

  await user1Context.close();
});

