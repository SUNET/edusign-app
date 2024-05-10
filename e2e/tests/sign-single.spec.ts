
import * as path from 'path';
import { test, expect } from '@playwright/test';

test('Sign one test PDF document', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  await page.goto('/sign');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/test.pdf'));

  await expect(page.locator('legend')).toContainText('Personal documents');
  await page.getByTestId('button-forced-preview-test.pdf').click();
  await page.getByTestId('preview-button-confirm-0').click();
  await page.getByTestId('button-sign').click();
  await page.getByPlaceholder('enter password').fill(process.env.USER1_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Use my security key' }).click();
  await expect(page.locator('[id="local-doc-test\\.pdf"]')).toContainText('Signed by:', { timeout: 25000 });
  await expect(page.locator('[id="local-doc-test\\.pdf"]')).toContainText('ENRIQUE PABLO PEREZ ARNAUD <enrique@cazalla.net>.');
  await expect(page.getByTestId('button-download-signed-test.pdf')).toBeVisible();

  await user1Context.close();
});
