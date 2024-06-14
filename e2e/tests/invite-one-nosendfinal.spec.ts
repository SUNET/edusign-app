
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, checkEmails, startAtSignPage, makeInvitation, signInvitation } from './utils.ts';

test('Make one invitation and sign it without sending the signed PDF', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation (user0, [user1], filename, {sendSigned: false, skipFinal: false, ordered: false, loa: 'low'});

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  const emailTests = [
    {
      to: `${user0.nameForMail} <${user0.email}>,\n ${user1.nameForMail} <${user1.email}>`,
      subject: `'${filename}' is now signed`,
      body: [
        `The document "${filename}" is now signed by all parties.`,
        `not attached`,
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

