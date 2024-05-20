
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview } from './utils.ts';

test('Sign one test PDF document', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'with-form.pdf';

  await user0.page.goto('/sign');

  await addFile(user0.page, filename);

  await expect(user0.page.locator('[id="local-doc-with-form\\.pdf"]')).toContainText(filename);

  await approveForcedPreview(user0.page, filename);

  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await user0.page.getByTestId(`menu-item-create-template-${filename}`).click();
  await expect(user0.page.locator('legend')).toContainText('Templates');
  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await user0.page.getByTestId(`menu-item-fillform-${filename}`).click();
  await user0.page.locator('#pdfjs_internal_id_5R').click();
  await user0.page.locator('#pdfjs_internal_id_5R').fill('John');
  await user0.page.locator('#pdfjs_internal_id_7R').click();
  await user0.page.locator('#pdfjs_internal_id_7R').fill('Lennon');
  await user0.page.locator('#pdfjs_internal_id_23R').click();
  await user0.page.locator('#pdfjs_internal_id_23R').fill('Abbey Road');
  await user0.page.locator('#pdfjs_internal_id_8R').click();
  await user0.page.locator('#pdfjs_internal_id_8R').fill('666');
  await user0.page.locator('#pdfjs_internal_id_10R').click();
  await user0.page.locator('#pdfjs_internal_id_10R').fill('41003');
  await user0.page.locator('#pdfjs_internal_id_13R').click();
  await user0.page.locator('#pdfjs_internal_id_13R').fill('London');
  await user0.page.locator('#pdfjs_internal_id_11R').selectOption('Britain');
  await user0.page.getByTestId(`pdfform-button-send-${filename}`).click();
  await expect(user0.page.locator('[id="local-doc-with-form-1\\.pdf"]')).toContainText('with-form-1.pdf');
});
