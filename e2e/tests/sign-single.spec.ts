
import { test, expect } from '@playwright/test';

test('Initial UI with no documents', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  await page.goto('/sign');

  await page.getByTestId('edusign-dnd-area').click();
  await expect(page.locator('legend')).toContainText('Personal documents');
  await page.getByTestId('button-forced-preview-ba66ef11-6c63-4513-88f9-3d8fa7703d14').click();
  await page.getByTestId('preview-button-confirm-0').click();
  await page.getByTestId('button-sign').click();
  await page.getByPlaceholder('enter password').fill(process.env.USER1_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Use my security key' }).click();
  await page.goto('https://signservice.test.edusign.sunet.se/sign/idsectest/saml/sso');
  await page.goto('https://dev.edusign.sunet.se/sign/callback');
  await expect(page.locator('[id="local-doc-test3\\.pdf"]')).toContainText('Signed by:');
  await expect(page.locator('[id="local-doc-test3\\.pdf"]')).toContainText('ENRIQUE PABLO PEREZ ARNAUD <enrique@cazalla.net>.');
  await expect(page.getByTestId('button-download-signed-ba66ef11-6c63-4513-88f9-3d8fa7703d14')).toBeVisible();

  await user1Context.close();
});
