
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, checkEmails, startAtSignPage } from './utils.ts';

test('Make one invitation and sign it with form defaults', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';

  await startAtSignPage(user0.page);

  await addFile(user0.page, filename);

  await expect(user0.page.locator('legend')).toContainText('Personal documents');

  await approveForcedPreview(user0.page, filename);

  await user0.page.getByTestId(`button-multisign-${filename}`).click();
  await user0.page.getByTestId('invitation-text-input').click();
  await user0.page.getByTestId('invitation-text-input').fill('This is a test invitation');
  await user0.page.getByTestId('invitees.0.name').click();
  await user0.page.getByTestId('invitees.0.name').fill(user1.name);
  await user0.page.getByTestId('invitees.0.email').click();
  await user0.page.getByTestId('invitees.0.email').fill(user1.email);
  await user0.page.getByTestId(`button-send-invites-${filename}`).click();
  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  let emailTests = [
    {
      to: `${user1.name} <${user1.email}>`,
      subject: 'You have been invited to sign "test.pdf"',
      body: [
        `You have been invited by ${user0.name} <${user0.email}>`,
        `to digitally sign a document named "${filename}"`,
        "Follow this link to preview and sign the document:",
      ],
    }
  ];
  await checkEmails(user0.page, emailTests);

  await user1.page.goto('/sign');

  await expect(user1.page.locator('legend')).toContainText('Documents you are invited to sign');
  await expect(user1.page.getByRole('group')).toContainText(filename);
  await expect(user1.page.getByRole('group')).toContainText(`Invited by:${user0.name} <${user0.email}>.`);
  await expect(user1.page.getByRole('group')).toContainText('Required security level: Low');

  await approveForcedPreview(user1.page, filename);

  await user1.page.getByTestId('button-sign').click();

  await user1.page.getByPlaceholder('enter password').fill(user1.pass);
  await user1.page.getByRole('button', { name: 'Log in' }).click();
  if (user1.key) {
    await user1.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(user1.page.getByTestId(`button-download-draft-${filename}`)).toContainText('Download (draft)');

  emailTests = [
    {
      to: `${user0.nameMime} <${user0.email}>,\n ${user1.name} <${user1.email}>`,
      subject: `'${filename}' is now signed`,
      body: [
        `The document "${filename}" is now signed by all parties and attached to this email.`,
        `Content-Disposition: attachment; filename="${signedFilename}"`,
      ],
    }
  ];
  await checkEmails(user1.page, emailTests);

  await user0.page.goto('/sign');
  await expect(user0.page.locator('legend')).toContainText('Personal documents');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await user0.page.getByText('Required security level: Low').click();
  await expect(user0.page.getByRole('group')).toContainText('Required security level: Low');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  await user0.page.getByTestId(`button-rm-invitation-${filename}`).click();
  await user0.page.getByTestId(`confirm-remove-signed-owned-${filename}-confirm-button`).click();
  await expect(user0.page.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');
});
