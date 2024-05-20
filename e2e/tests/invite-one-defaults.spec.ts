
import * as path from 'path';
import { test, expect } from '@playwright/test';

test('Sign one test PDF document', async ({ browser }) => {
  const user1Context = await browser.newContext({ storageState: 'playwright/.auth/user1.json' });
  const user2Context = await browser.newContext({ storageState: 'playwright/.auth/user2.json' });
  let page1 = await user1Context.newPage();

  const withKey1 = process.env.USER1_SECURITY_KEY === "True";
  const withKey2 = process.env.USER2_SECURITY_KEY === "True";

  await page1.goto('/sign');

  const fileChooserPromise = page1.waitForEvent('filechooser');
  await page1.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/test.pdf'));

  await expect(page1.locator('legend')).toContainText('Personal documents');
  await page1.getByTestId('button-forced-preview-test.pdf').click();
  await page1.getByTestId('preview-button-confirm-0').click();

  await page1.getByTestId('button-multisign-test.pdf').click();
  await page1.getByTestId('invitation-text-input').click();
  await page1.getByTestId('invitation-text-input').fill('This is a test invitation');
  await page1.getByTestId('invitees.0.name').click();
  await page1.getByTestId('invitees.0.name').fill('Test User2');
  await page1.getByTestId('invitees.0.email').click();
  await page1.getByTestId('invitees.0.email').fill('enrique+4@cazalla.net');
  await page1.getByTestId('button-send-invites-test.pdf').click();
  await expect(page1.getByRole('group')).toContainText('Waiting for signatures by:Test User2 <enrique+4@cazalla.net> .')

  const page2 = await user2Context.newPage();
  await page2.goto('/sign');

  await expect(page2.locator('legend')).toContainText('Documents you are invited to sign');
  await expect(page2.getByRole('group')).toContainText('test.pdf');
  await expect(page2.getByRole('group')).toContainText('Invited by:Enrique Pérez <enrique+5@cazalla.net>.');
  await expect(page2.getByRole('group')).toContainText('Required security level: Low');
  await page2.getByTestId('button-forced-preview-test.pdf').click();
  await page2.getByTestId('preview-button-confirm-0').click();
  await page2.getByTestId('button-sign').click();

  await page2.getByPlaceholder('enter password').fill(process.env.USER2_PASS);
  await page2.getByRole('button', { name: 'Log in' }).click();
  if (withKey2) {
    await page2.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(page2.getByTestId('button-download-draft-test.pdf')).toContainText('Download (draft)');

  page1 = await user1Context.newPage();
  await page1.goto('/sign');

  await expect(page1.locator('legend')).toContainText('Personal documents');
  await expect(page1.getByRole('group')).toContainText('Signed by:Test User2 <enrique+4@cazalla.net> .');
  await page1.getByText('Required security level: Low').click();
  await expect(page1.getByRole('group')).toContainText('Required security level: Low');
  await expect(page1.getByTestId('button-download-signed-test.pdf')).toContainText('Download (signed)');
  await expect(page1.getByTestId('button-multisign-test.pdf')).toContainText('Invite others to sign');
  await expect(page1.getByTestId('button-rm-invitation-test.pdf')).toContainText('Remove');

  await page1.getByTestId('button-rm-invitation-test.pdf').click();
  await page1.getByTestId('confirm-remove-signed-owned-test.pdf-confirm-button').click();
  await expect(page1.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');

  await user1Context.close();
  await user2Context.close();
});

