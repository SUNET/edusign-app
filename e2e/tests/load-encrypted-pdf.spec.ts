
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load encrypted PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await addFile(user0.page, 'encrypted.pdf');

  await expect(user0.page.locator('[id="local-doc-encrypted\\.pdf"]')).toContainText('Failed to insert sign page');
});

