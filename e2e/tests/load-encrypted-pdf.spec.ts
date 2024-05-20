
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile } from './utils.ts';

test('Sign one test PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await user0.page.goto('/sign');

  await addFile(user0.page, 'encrypted.pdf');

  await expect(user0.page.locator('[id="local-doc-encrypted\\.pdf"]')).toContainText('Failed to insert sign page');
});

