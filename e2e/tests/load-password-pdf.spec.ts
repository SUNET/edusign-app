
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage, rmDocument } from './utils.ts';

test('Load password protected PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'with-password.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator(`[id="local-doc-${filename}"]`)).toContainText('Please do not supply a password protected document');

  await rmDocument(user0, filename, 'invitation');
});

