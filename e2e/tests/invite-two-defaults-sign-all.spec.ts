
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, signInvitation, addFinalSignature, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make two invitations with form defaults and sign them', async ({ browser }) => {

  const { user0, user1, user2 } = await login(browser, 3);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1, user2], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1, user2], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> ,${user2.name} <${user2.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  const spec2 = ['signed', user0, [user1], filename];
  await checkEmails(user1.page, [spec2]);

  await user0.page.goto('/sign');
  await expect(user0.page.getByTestId('legend-inviter')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user2.name} <${user2.email}> .`)
  await expect(user0.page.getByRole('group')).toContainText('Required security level: Low');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  await signInvitation(user2, user0, filename, draftFilename)

  const spec3 = ['signed-last', user0, [user2], filename];
  await checkEmails(user2.page, [spec3]);

  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> ,${user2.name} <${user2.email}> .`);

  await addFinalSignature(user0, filename);

  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');

  await rmDocument(user0, filename, 'invitation');

  const spec4 = ['final-attached', user0, [], filename, {signedFilename: signedFilename}];
  await checkEmails(user0.page, [spec4]);
});
