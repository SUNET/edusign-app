
import * as path from 'path';
import { test, expect } from '@playwright/test';

test('Sign one test PDF document', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  await page.goto('/sign');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/multi-page.pdf'));

  await expect(page.locator('[id="local-doc-multi-page\\.pdf"]')).toContainText('multi-page.pdf');
  await expect(page.getByTestId('button-forced-preview-multi-page.pdf')).toBeVisible();
  await page.getByTestId('button-forced-preview-multi-page.pdf').click();
  await expect(page.getByRole('dialog')).toContainText('multi-page.pdf');
  await expect(page.getByLabel('Close')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Project description.');
  await expect(page.locator('#arrowfirst-path1')).toBeVisible();
  await expect(page.getByTestId('preview-button-prev-0').locator('path')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('1 / 3');
  await expect(page.getByTestId('preview-button-next-0')).toBeVisible();
  await expect(page.getByTestId('preview-button-last-0')).toBeVisible();
  await expect(page.locator('span').filter({ hasText: 'Approve' })).toBeVisible();
  await expect(page.getByTestId('preview-button-dissaprove-0')).toBeVisible();
  await page.getByTestId('preview-button-next-0').click();
  await expect(page.getByRole('dialog')).toContainText('Still to do.');
  await expect(page.getByRole('dialog')).toContainText('2 / 3');
  await page.getByTestId('preview-button-prev-0').click();
  await expect(page.getByRole('dialog')).toContainText('1 / 3');
  await page.getByTestId('preview-button-next-0').click();
  await expect(page.getByRole('dialog')).toContainText('2 / 3');
  await page.getByTestId('preview-button-next-0').click();
  await expect(page.getByRole('dialog')).toContainText('Result page.');
  await expect(page.getByRole('dialog')).toContainText('3 / 3');
  await page.getByTestId('preview-button-first-0').first().click();
  await expect(page.getByRole('dialog')).toContainText('1 / 3');
  await page.getByTestId('preview-button-last-0').click();
  await expect(page.getByRole('dialog')).toContainText('3 / 3');
  await page.getByTestId('preview-button-confirm-0').click();
  await expect(page.locator('[id="local-doc-multi-page\\.pdf"]')).toContainText('multi-page.pdf');
  await expect(page.getByTestId('button-multisign-multi-page.pdf')).toBeVisible();
  await expect(page.getByTestId('button-rm-invitation-multi-page.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Other options' })).toBeVisible();
  await page.getByRole('button', { name: 'Other options' }).click();
  await expect(page.getByTestId('menu-item-create-template-multi-page.pdf')).toBeVisible();
  await expect(page.getByTestId('menu-item-preview-multi-page.pdf')).toBeVisible();
  await page.getByTestId('menu-item-preview-multi-page.pdf').click();
  await expect(page.getByRole('dialog')).toContainText('1 / 3');
  await page.getByTestId('preview-button-last-0').click();
  await expect(page.getByRole('dialog')).toContainText('3 / 3');
  await expect(page.getByRole('dialog')).toContainText('Result page.');
  await expect(page.getByTestId('preview-button-close-multi-page.pdf')).toBeVisible();
  await page.getByTestId('preview-button-close-multi-page.pdf').click();
  await expect(page.getByText('14.9 KiBmulti-page.pdfOther')).toBeVisible();

  await user1Context.close();
});

