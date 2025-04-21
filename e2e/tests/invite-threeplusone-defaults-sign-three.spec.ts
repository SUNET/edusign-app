
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, addInvitation, signInvitation, declineInvitation, addFinalSignature, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make three invitations with form defaults, sign and decline, and add new invitation, then sign all', async ({ browser }) => {

  const { user0, user1, user2, user3, user4 } = await login(browser, 5);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1, user2, user3], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1, user2, user3], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> ,${user2.name} <${user2.email}> ,${user3.name} <${user3.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  const spec2 = ['signed', user0, [user1], filename];
  await checkEmails(user0.page, [spec2]);

  await user0.page.goto('/sign');
  await expect(user0.page.getByTestId('legend-inviter')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user2.name} <${user2.email}> ,${user3.name} <${user3.email}> .`)
  await expect(user0.page.getByRole('group')).toContainText('Required assurance level: Low');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  await declineInvitation(user2, user0, filename)

  const spec3 = ['declined', user0, [user2], filename];
  await checkEmails(user0.page, [spec3]);

  await user0.page.goto('/sign');
  await expect(user0.page.getByTestId('legend-inviter')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Declined to sign by:${user2.name} <${user2.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user3.name} <${user3.email}> .`)

  await addInvitation(user0, user4, filename, 1);

  const spec4 = ['invitation', user0, [user4], filename];
  await checkEmails(user0.page, [spec4]);

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user3.name} <${user3.email}> ,${user4.name} <${user4.email}> .`)

  await signInvitation(user3, user0, filename, draftFilename);

  const spec5 = ['signed', user0, [user3], filename];
  await checkEmails(user0.page, [spec5]);

  await signInvitation(user4, user0, filename, draftFilename);

  const spec6 = ['signed-last', user0, [user4], filename];
  await checkEmails(user2.page, [spec6]);

  await expect(user0.page.getByRole('group')).toContainText(`Signed by:${user1.name} <${user1.email}> ,${user3.name} <${user3.email}> ,${user4.name} <${user4.email}> .`);
  await expect(user0.page.getByRole('group')).toContainText(`Declined to sign by:${user2.name} <${user2.email}> .`);

  await addFinalSignature(user0, filename);

  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');

  await rmDocument(user0, filename, 'invitation');

  const spec7 = ['final-attached', user0, [], filename, {signedFilename: signedFilename}];
  await checkEmails(user0.page, [spec7]);
});
