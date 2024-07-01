
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, startAtSignPage, rmDocument } from './utils.ts';

test('Navigate preview of multi page PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'multi-page.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator(`[id="local-doc-${filename}"]`)).toContainText(filename);
  await expect(user0.page.getByTestId(`button-forced-preview-${filename}`)).toBeVisible();
  await user0.page.getByTestId(`button-forced-preview-${filename}`).click();
  await expect(user0.page.getByRole('dialog')).toContainText(filename);
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
  await expect(user0.page.locator(`[id="local-doc-${filename}"]`)).toContainText('multi-page.pdf');
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toBeVisible();
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toBeVisible();
  await expect(user0.page.getByRole('button', { name: 'Other options' })).toBeVisible();
  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await expect(user0.page.getByTestId(`menu-item-create-template-${filename}`)).toBeVisible();
  await expect(user0.page.getByTestId(`menu-item-preview-${filename}`)).toBeVisible();
  await user0.page.getByTestId(`menu-item-preview-${filename}`).click();
  await expect(user0.page.getByRole('dialog')).toContainText('1 / 3');
  await user0.page.getByTestId('preview-button-last-0').click();
  await expect(user0.page.getByRole('dialog')).toContainText('3 / 3');
  await expect(user0.page.getByRole('dialog')).toContainText('Result page.');
  await expect(user0.page.getByTestId(`preview-button-close-${filename}`)).toBeVisible();
  await user0.page.getByTestId(`preview-button-close-${filename}`).click();
  await expect(user0.page.getByText(`14.9 KiB${filename}Other`)).toBeVisible();

  await rmDocument(user0, filename, 'invitation');
});

