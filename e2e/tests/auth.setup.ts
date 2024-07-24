
import { test as setup, expect } from '@playwright/test';

const _authenticate = async (page, username, password, filename, withKey=false) => {
  await page.goto('https://dev.edusign.sunet.se/');
  await expect(page.locator('#main-title')).toContainText('eduSign - Secure digital signature');
  await expect(page.locator('#edusign-logo').getByRole('img')).toBeVisible();
  await page.frameLocator('iframe[title="SeamlessAccess Button"]').getByRole('button', { name: 'Access through your' }).click();
  await page.getByLabel('Find your institution,').click();
  await page.getByLabel('Find your institution,').fill('eduid');
  await page.getByLabel('Find your institution,').press('Enter');
  await page.locator('a').filter({ hasText: 'eduID Sweden eduid.se' }).click();
  await page.getByPlaceholder('email or username').fill(username);
  await page.getByPlaceholder('enter password').fill('');
  await page.getByPlaceholder('enter password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (withKey) {
    await page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(page.getByTestId('edusign-logo').getByRole('img')).toBeVisible();

  await page.context().storageState({ path: filename });
}

setup('Authenticate as user 1', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const username = process.env.USER0_EMAIL;
  const password = process.env.USER0_PASS;
  const filename = 'playwright/.auth/user0.json';

  const withKey = process.env.USER0_SECURITY_KEY === "True";

  await _authenticate(page, username, password, filename, withKey);
});

setup('Authenticate as user 2', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const username = process.env.USER1_EMAIL;
  const password = process.env.USER1_PASS;
  const filename = 'playwright/.auth/user1.json';

  const withKey = process.env.USER1_SECURITY_KEY === "True";

  await _authenticate(page, username, password, filename, withKey);
});

setup('Authenticate as user 3', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const username = process.env.USER2_EMAIL;
  const password = process.env.USER2_PASS;
  const filename = 'playwright/.auth/user2.json';

  const withKey = process.env.USER2_SECURITY_KEY === "True";

  await _authenticate(page, username, password, filename, withKey);
});

setup('Authenticate as user 4', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const username = process.env.USER3_EMAIL;
  const password = process.env.USER3_PASS;
  const filename = 'playwright/.auth/user3.json';

  const withKey = process.env.USER3_SECURITY_KEY === "True";

  await _authenticate(page, username, password, filename, withKey);
});

setup('Authenticate as user 5', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const username = process.env.USER4_EMAIL;
  const password = process.env.USER4_PASS;
  const filename = 'playwright/.auth/user4.json';

  const withKey = process.env.USER4_SECURITY_KEY === "True";

  await _authenticate(page, username, password, filename, withKey);
});
