
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, checkEmails, startAtSignPage, makeInvitation, signInvitation, encodeMailHeader, rmDocument } from './utils.ts';

test('Make two invitations with form defaults and sign them', async ({ browser }) => {

  const { user0, user1, user2 } = await login(browser, 3);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1, user2], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}>, ${user2.name} <${user2.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  let subject = `${user1.name} signed '${filename}'`
  if (user1.utf8Name) {
    subject = encodeMailHeader(subject)
  }

  let emailTests = [
    {
      to: `${user0.nameForMail} <${user0.email}>`,
      subject: subject,
      body: [
        `${user1.name} <${user1.email}> has signed the document "${filename}"`,
        `This is an email from eduSign, a service for secure digital signatures, developed by Sunet.`,
      ],
    }
  ];
  await checkEmails(user1.page, emailTests);

  await user0.page.goto('/sign');
  await expect(user0.page.locator('legend')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user2.name} <${user2.email}> .`)
  await expect(user0.page.getByRole('group')).toContainText('Required security level: Low');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  subject = `${user2.name} signed '${filename}'`
  if (user2.utf8Name) {
    subject = encodeMailHeader(subject)
  }

  const emailTests = [
    {
      to: `${user0.nameForMail} <${user0.email}>`,
      subject: subject,
      body: [
        `${user2.name} <${user2.email}> has signed the document "${filename}"`,
        `This was the final reply to your invitation to sign this document.`,
        `Please visit eduSign to finalize the signature process.`,
        `This is an email from eduSign, a service for secure digital signatures, developed by Sunet.`,
      ],
    }
  ];

  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}>, ${user2.name} <${user2.email}> .`);

  await user0.page.getByTestId(`doc-selector-${filename}`).check();
  await user0.page.getByTestId('button-sign').click();
  await user0.page.getByPlaceholder('enter password').fill(user0.pass);
  await user0.page.getByRole('button', { name: 'Log in' }).click();
  if (user0.key) {
    await user0.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');

  await rmDocument(user0, filename, 'invitation');
});

