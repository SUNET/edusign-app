
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load and remove document', async ({ browser }) => {

  const filename = 'test.pdf';
  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await user0.page.getByTestId(`button-forced-preview-${filename}`).click();
  await user0.page.getByTestId('preview-button-confirm-0').click();
  await user0.page.getByTestId(`button-rm-invitation-${filename}`).click();
  await user0.page.getByTestId(`confirm-remove-document-${filename}-confirm-button`).click();

  await expect(user0.page.locator('legend').all().length).toBe(0);
});

