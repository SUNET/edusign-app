
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage, rmDocument } from './utils.ts';

test('Load duplicate PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'test.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await addFile(user0.page, filename);

  await expect(user0.page.getByTestId("edusign-notifications-area")).toContainText('A document with that name has already been loaded');

  await rmDocument(user0, filename, 'invitation');
});


