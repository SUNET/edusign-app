
import * as path from 'path';
import { test, expect } from '@playwright/test';

test('Sign one test PDF document', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  const withKey = process.env.USER1_SECURITY_KEY === "True";

  await page.goto('/sign');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/with-form.pdf'));

  await expect(page.locator('[id="local-doc-with-form\\.pdf"]')).toContainText('with-form.pdf');
  await page.getByTestId('button-forced-preview-with-form.pdf').click();
  await expect(page.getByRole('dialog')).toContainText('PDF Form Example');
  await page.getByTestId('preview-button-confirm-0').click();
  await page.getByRole('button', { name: 'Other options' }).click();
  await page.getByTestId('menu-item-create-template-with-form.pdf').click();
  await expect(page.locator('legend')).toContainText('Templates');
  await page.getByRole('button', { name: 'Other options' }).click();
  await page.getByTestId('menu-item-fillform-with-form.pdf').click();
  await page.locator('#pdfjs_internal_id_5R').click();
  await page.locator('#pdfjs_internal_id_5R').fill('Jane');
  await page.locator('#pdfjs_internal_id_7R').click();
  await page.locator('#pdfjs_internal_id_7R').fill('Doe');
  await page.locator('#pdfjs_internal_id_23R').click();
  await page.locator('#pdfjs_internal_id_23R').fill('Abbey Road');
  await page.locator('#pdfjs_internal_id_8R').click();
  await page.locator('#pdfjs_internal_id_8R').fill('666');
  await page.locator('#pdfjs_internal_id_10R').click();
  await page.locator('#pdfjs_internal_id_10R').fill('41003');
  await page.locator('#pdfjs_internal_id_13R').click();
  await page.locator('#pdfjs_internal_id_13R').fill('London');
  await page.locator('#pdfjs_internal_id_11R').selectOption('Britain');
  await page.getByTestId('pdfform-button-send-with-form.pdf').click();
  await expect(page.locator('[id="local-doc-with-form-1\\.pdf"]')).toContainText('with-form-1.pdf');

  await user1Context.close();
});
