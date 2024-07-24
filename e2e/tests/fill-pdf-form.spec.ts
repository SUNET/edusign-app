
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, rmDocument } from './utils.ts';

test('Load and fill PDF form', async ({ browser }) => {

  const { user0 } = await login(browser, 1);
  const filename = 'with-form.pdf';
  const filename2 = 'with-form-1.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator(`[id="local-doc-${filename}"]`)).toContainText(filename);

  await approveForcedPreview(user0.page, filename);

  await user0.page.getByRole('button', { name: 'Other options' }).click();
  await user0.page.getByTestId(`menu-item-create-template-${filename}`).click();
  await expect(user0.page.getByTestId('legend-templates')).toContainText('Templates');
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
  await expect(user0.page.locator(`[id="local-doc-${filename2}"]`)).toContainText('with-form-1.pdf');

  await rmDocument(user0, filename, 'template');
  await rmDocument(user0, filename2, 'invitation');
});
