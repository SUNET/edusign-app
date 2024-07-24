
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage, approveForcedPreview, rmDocument } from './utils.ts';

test('Load and remove document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'test.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await approveForcedPreview(user0.page, filename);
  await rmDocument(user0, filename, 'invitation');

  const legends = await user0.page.getByRole('legend');
  await expect(legends).toHaveCount(0);
});

