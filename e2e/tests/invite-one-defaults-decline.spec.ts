
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, signInvitation, declineInvitation, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make one invitation with form defaults and decline it', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await declineInvitation(user1, user0, filename)

  const spec2 = ['declined', user0, [user1], filename, {last: true}];
  await checkEmails(user1.page, [spec2]);

  await user0.page.goto('/sign');
  await expect(user0.page.getByTestId('legend-inviter')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Declined to sign by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText('Required assurance level: Low');
  await expect(user0.page.getByTestId(`button-skipping-${filename}`)).toContainText('Skip Signature');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  await user0.page.getByTestId(`button-skipping-${filename}`).click();

  await expect(user0.page.getByTestId('legend-personal')).toContainText('Personal documents');
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');  // XXX not signed

  const spec3 = ['final-attached', user0, [], filename, {signedFilename: signedFilename}];  // XXX not signed
  await checkEmails(user0.page, [spec3]);  // XXX

  await rmDocument(user0, filename, 'invitation');
});

