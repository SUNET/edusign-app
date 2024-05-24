
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load and reject PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, 'test.pdf');

  await expect(user0.page.locator('legend')).toContainText('Personal documents');
  await user0.page.getByTestId('button-forced-preview-test.pdf').click();
  await user0.page.getByTestId('preview-button-dissaprove-0').click();
});

