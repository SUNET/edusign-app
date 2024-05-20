
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile } from './utils.ts';

test('Sign one test PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await user0.page.goto('/sign');

  await addFile(user0.page, 'test.pdf');

  await expect(user0.page.locator('legend')).toContainText('Personal documents');
  await user0.page.getByTestId('button-forced-preview-test.pdf').click();
  await user0.page.getByTestId('preview-button-dissaprove-0').click();
});

