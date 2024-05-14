
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
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/with-password.pdf'));

  await expect(page.locator('[id="local-doc-with-password\\.pdf"]')).toContainText('Please do not supply a password protected document');

  await user1Context.close();
});

