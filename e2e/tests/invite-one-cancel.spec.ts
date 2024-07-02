
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { login, addFile, approveForcedPreview, startAtSignPage, makeInvitation, signInvitation, addFinalSignature, encodeMailHeader, rmDocument } from './utils.ts';
import { checkEmails } from './utils-emails.ts';

test('Make one invitation and cancel it', async ({ browser }) => {

  const { user0, user1 } = await login(browser, 2);
  const filename = 'test.pdf';

  await makeInvitation(user0, [user1], filename, {sendSigned: true, skipFinal: false, ordered: false, loa: 'low'});

  const spec1 = ['invitation', user0, [user1], filename];
  await checkEmails(user0.page, [spec1]);

  await expect(user0.page.getByRole('group')).toContainText(`Waiting for signatures by:${user1.name} <${user1.email}> .`)

  await rmDocument(user0, filename, 'invitation');

  const spec2 = ['cancellation', user0, [user1], filename];
  await checkEmails(user0.page, [spec2]);
});

