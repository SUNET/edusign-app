
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load password protected PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, 'with-password.pdf');

  await expect(user0.page.locator('[id="local-doc-with-password\\.pdf"]')).toContainText('Please do not supply a password protected document');
});

