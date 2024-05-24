
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Sign one test XML document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, 'simple.xml');

  await expect(user0.page.locator('[id="local-doc-simple\\.xml"]')).toContainText('simple.xml');
  await user0.page.getByTestId('button-forced-preview-simple.xml').click();
  await expect(user0.page.locator('pre')).toContainText('1<test>helloóöo</test>');
  await user0.page.getByTestId('preview-button-confirm-0').click();
  await user0.page.getByTestId('button-sign').click();
  await user0.page.getByPlaceholder('enter password').fill(user0.pass);
  await user0.page.getByRole('button', { name: 'Log in' }).click();
  if (user0.key) {
    await user0.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(user0.page.locator('[id="local-doc-simple\\.xml"]')).toContainText(`Signed by:${user0.name} <${user0.email}>.`);
  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await user0.page.getByTestId('menu-item-preview-simple.xml').click();
  await expect(user0.page.locator('pre')).toContainText('<ds:SignedInfo>');
});

