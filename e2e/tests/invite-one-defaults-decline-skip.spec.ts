
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, signInvitation, declineInvitation, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make one invitation with skip final and decline it', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';
  const signedFilename = 'test-signed.pdf';
  const draftFilename = 'test-draft.pdf';

  await makeInvitation(user0, [user1], filename, {sendSigned: true, skipFinal: true, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByTestId(`representation-for-doc-${filename}`)).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await declineInvitation(user1, user0, filename)

  const spec2 = ['declined', user0, [user1], filename, {last: true, skip: true}];
  const spec3 = ['final-attached', user0, [], filename, {signedFilename: signedFilename}];  // XXX Not signed
  await checkEmails(user0.page, [spec2, spec3]);

  await expect(user0.page.getByTestId(`representation-for-doc-${filename}`)).toContainText(`Declined to sign by:${user1.name} <${user1.email}> .`);

  await rmDocument(user0, filename, 'invitation');
});
