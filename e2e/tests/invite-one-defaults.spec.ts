
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { encodeWord } from 'libmime';
import { login, addFile, approveForcedPreview, checkEmails, startAtSignPage, makeInvitation, signInvitation } from './utils.ts';

test('Make one invitation and sign it with form defaults', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  let subject = `${user1.name} signed '${filename}'`
  if (user1.utf8Name) {
    subject = encodeWord(subject, 'q').replace('?UTF-8?Q?', '?utf-8?q?')
  }

  const emailTests = [
    {
      to: `${user0.nameForMail} <${user0.email}>`,
      subject: subject,
      body: [
        `${user1.name} <${user1.email}> has signed the document "${filename}"`,
        `This was the final reply to your invitation to sign this document.`,
        `Please visit eduSign to finalize the signature process.`,
        `This is an email from eduSign, a service for secure digital signatures, developed by Sunet.`,
      ],
    }
  ];
  await checkEmails(user1.page, emailTests);

  await user0.page.goto('/sign');
  await expect(user0.page.locator('legend')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText('Required security level: Low');
  await expect(user0.page.getByTestId(`button-skipping-${filename}`)).toContainText('Skip Signature');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');


  await user0.page.getByTestId(`doc-selector-${filename}`).check();
  await user0.page.getByTestId('button-sign').click();
  await user0.page.getByPlaceholder('enter password').fill(user0.pass);
  await user0.page.getByRole('button', { name: 'Log in' }).click();
  if (user0.key) {
    await user0.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');

  await user0.page.getByTestId(`button-rm-invitation-${filename}`).click();
  await user0.page.getByTestId(`confirm-remove-signed-owned-${filename}-confirm-button`).click();
  await expect(user0.page.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');
});
