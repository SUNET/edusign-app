
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage } from './utils.ts';

test('Navigate preview of multi page PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'multi-page.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator(`[id="local-doc-${filename}"]`)).toContainText('multi-page.pdf');
  await expect(user0.page.getByTestId('button-forced-preview-multi-page.pdf')).toBeVisible();
  await user0.page.getByTestId('button-forced-preview-multi-page.pdf').click();
  await expect(user0.page.getByRole('dialog')).toContainText('multi-page.pdf');
  await expect(user0.page.getByLabel('Close')).toBeVisible();
  await expect(user0.page.getByRole('dialog')).toContainText('Project description.');
  await expect(user0.page.locator('#arrowfirst-path1')).toBeVisible();
  await expect(user0.page.getByTestId('preview-button-prev-0').locator('path')).toBeVisible();
  await expect(user0.page.getByRole('dialog')).toContainText('1 / 3');
  await expect(user0.page.getByTestId('preview-button-next-0')).toBeVisible();
  await expect(user0.page.getByTestId('preview-button-last-0')).toBeVisible();
  await expect(user0.page.locator('span').filter({ hasText: 'Approve' })).toBeVisible();
  await expect(user0.page.getByTestId('preview-button-dissaprove-0')).toBeVisible();
  await user0.page.getByTestId('preview-button-next-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('Still to do.');
  await expect(user0.page.getByRole('dialog')).toContainText('2 / 3');
  await user0.page.getByTestId('preview-button-prev-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('1 / 3');
  await user0.page.getByTestId('preview-button-next-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('2 / 3');
  await user0.page.getByTestId('preview-button-next-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('Result page.');
  await expect(user0.page.getByRole('dialog')).toContainText('3 / 3');
  await user0.page.getByTestId('preview-button-first-0').first().click();
  await expect(user0.page.getByRole('dialog')).toContainText('1 / 3');
  await user0.page.getByTestId('preview-button-last-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('3 / 3');
  await user0.page.getByTestId('preview-button-confirm-0').click();
  await expect(user0.page.locator('[id="local-doc-multi-page\\.pdf"]')).toContainText('multi-page.pdf');
  await expect(user0.page.getByTestId('button-multisign-multi-page.pdf')).toBeVisible();
  await expect(user0.page.getByTestId('button-rm-invitation-multi-page.pdf')).toBeVisible();
  await expect(user0.page.getByRole('button', { name: 'Other options' })).toBeVisible();
  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await expect(user0.page.getByTestId('menu-item-create-template-multi-page.pdf')).toBeVisible();
  await expect(user0.page.getByTestId('menu-item-preview-multi-page.pdf')).toBeVisible();
  await user0.page.getByTestId('menu-item-preview-multi-page.pdf').click();
  await expect(user0.page.getByRole('dialog')).toContainText('1 / 3');
  await user0.page.getByTestId('preview-button-last-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('3 / 3');
  await expect(user0.page.getByRole('dialog')).toContainText('Result page.');
  await expect(user0.page.getByTestId('preview-button-close-multi-page.pdf')).toBeVisible();
  await user0.page.getByTestId('preview-button-close-multi-page.pdf').click();
  await expect(user0.page.getByText('14.9 KiBmulti-page.pdfOther')).toBeVisible();

  await rmDocument(user0, filename, 'invitation');
});

