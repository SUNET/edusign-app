
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Load and reject PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = "test.pdf"

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.getByTestId('legend-personal')).toContainText('Personal documents');
  await user0.page.getByTestId(`button-forced-preview-${filename}`).click();
  await user0.page.getByTestId('preview-button-dissaprove-0').click();

  const legends = await user0.page.getByRole('legend');
  await expect(legends).toHaveCount(0);
});

