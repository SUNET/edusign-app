
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load signed PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = "with-signature.pdf";

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator(`[id="local-doc-with-${filename}"]`)).toContainText('Previously signed by:Quique Pérez.');
});
