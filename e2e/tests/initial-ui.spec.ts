import { test, expect } from '@playwright/test';

test('Initial UI with no documents', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const page = await user1Context.newPage();

  await page.goto('/sign');

  await expect(page).toHaveTitle(/eduSign/);
  await expect(page.getByTestId('edusign-logo').getByRole('img')).toBeVisible();
  await expect(page.locator('#signing-with-span')).toContainText('Signed in as Enrique Pérez');
  await expect(page.getByTestId('button-logout')).toBeVisible();
  await expect(page.getByRole('link')).toBeVisible();
  await expect(page.locator('#dnd-area-head-1')).toContainText('Drag and drop files to be signed here');
  await expect(page.locator('#dnd-area-head-2')).toContainText('or');
  await expect(page.locator('#dnd-area-head-3')).toContainText('click here to choose files to be signed');
  await expect(page.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');
  await expect(page.locator('#button-sign-wrapper')).toBeVisible();
  await expect(page.locator('#button-dlall-wrapper')).toBeVisible();
  await expect(page.locator('#button-clear-wrapper')).toBeVisible();
  await expect(page.locator('label')).toContainText('Show contextual help');
  await expect(page.getByTestId('edusign-footer').locator('span')).toBeVisible();
  await expect(page.getByTestId('language-selector')).toBeVisible();

  await user1Context.close();
});
