import { test, expect } from '@playwright/test';

test('Home page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/eduSign/);
  await expect(page.locator('#sunet-logo')).toBeVisible();
  await expect(page.locator('#main-title')).toContainText('eduSign - Secure digital signature');
  await expect(page.frameLocator('iframe[title="SeamlessAccess Button"]').getByRole('button', { name: 'Access through your' })).toBeVisible();
  await expect(page.locator('h2')).toContainText('To sign');
  await expect(page.getByRole('paragraph')).toContainText('This service can be used to upload and sign PDF-documents or XML-documents. This is done easily by performing the following steps:');
  await expect(page.getByRole('list')).toContainText('Upload documents to sign');
  await expect(page.getByRole('list')).toContainText('Confirm the uploaded documents are correct');
  await expect(page.getByRole('list')).toContainText('Identify yourself with the appropriate SWAMID electronic ID');
  await expect(page.getByRole('list')).toContainText('Download signed document');
  await expect(page.locator('#faq-link')).toContainText('Help');
  await expect(page.getByRole('combobox')).toBeVisible();
});
