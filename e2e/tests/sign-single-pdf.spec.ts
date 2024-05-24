
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Sign one test PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, 'test.pdf');

  await expect(user0.page.locator('legend')).toContainText('Personal documents');
  await user0.page.getByTestId('button-forced-preview-test.pdf').click();
  await user0.page.getByTestId('preview-button-confirm-0').click();
  await user0.page.getByTestId('button-sign').click();
  await user0.page.getByPlaceholder('enter password').fill(user0.pass);
  await user0.page.getByRole('button', { name: 'Log in' }).click();
  if (user0.key) {
    await user0.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(user0.page.locator('[id="local-doc-test\\.pdf"]')).toContainText('Signed by:');
  await expect(user0.page.locator('[id="local-doc-test\\.pdf"]')).toContainText(`${user0.name} <${user0.email}>.`);
  await expect(user0.page.getByTestId('button-download-signed-test.pdf')).toBeVisible();
});
