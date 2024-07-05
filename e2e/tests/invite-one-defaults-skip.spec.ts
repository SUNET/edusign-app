
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, signInvitation, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make one invitation and sign it with form defaults', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByTestId(`representation-for-doc-${filename}`)).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await signInvitation(user1, user0, filename, draftFilename)

  const spec2 = ['signed-last', user0, [user1], filename];
  await checkEmails(user1.page, [spec2]);

  await user0.page.goto('/sign');
  await expect(user0.page.getByTestId('legend-inviter')).toContainText('Documents you have invited others to sign');
  await expect(user0.page.getByTestId(`representation-for-doc-${filename}`)).toContainText(`Signed by:${user1.name} <${user1.email}> .`);
  await expect(user0.page.getByTestId(`representation-for-doc-${filename}`)).toContainText('Required security level: Low');
  await expect(user0.page.getByTestId(`button-skipping-${filename}`)).toContainText('Skip Signature');
  await expect(user0.page.getByTestId(`button-rm-invitation-${filename}`)).toContainText('Remove');

  await user0.page.getByTestId(`button-skipping-${filename}`).click();
  await expect(user0.page.getByTestId(`button-multisign-${filename}`)).toContainText('Invite others to sign');
  await expect(user0.page.getByTestId(`button-download-signed-${filename}`)).toContainText('Download (signed)');

  const spec3 = ['final-attached', user0, [user1], filename, {signedFilename: signedFilename}];
  await checkEmails(user0.page, [spec3]);

  await rmDocument(user0, filename, 'invitation');
});

