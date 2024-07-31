import { test, expect } from '@playwright/test';
import { login, startAtSignPage, checkTooltip } from './utils.ts';

test('Initial UI with no documents', async ({ browser }) => {

  const { user0 } = await login(browser, 1);

  await startAtSignPage(user0.page);

  await expect(user0.page).toHaveTitle(/eduSign/);
  await expect(user0.page.getByTestId('edusign-logo').getByRole('img')).toBeVisible();
  await expect(user0.page.locator('#signing-with-span')).toContainText(`Signed in as ${user0.name}`);
  await expect(user0.page.getByTestId('button-logout')).toBeVisible();
  await expect(user0.page.getByRole('link')).toBeVisible();
  await expect(user0.page.locator('#dnd-area-head-1')).toContainText('Drag and drop files to be signed here');
  await expect(user0.page.locator('#dnd-area-head-2')).toContainText('or');
  await expect(user0.page.locator('#dnd-area-head-3')).toContainText('click here to choose files to be signed');
  await expect(user0.page.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');

  const helpText = 'Select documents above and click here to send them for signing. You will be redirected to login again to authenticate yourself when signing.';
  await checkTooltip(user0, '#button-sign-wrapper', 'button-sign-selected', helpText);

  await expect(user0.page.locator('#button-dlall-wrapper')).toBeVisible();
  await expect(user0.page.locator('#button-clear-wrapper')).toBeVisible();
  await expect(user0.page.locator('label')).toContainText('Show contextual help');
  await expect(user0.page.getByTestId('edusign-footer').locator('span')).toBeVisible();
  await expect(user0.page.getByTestId('language-selector')).toBeVisible();
});
