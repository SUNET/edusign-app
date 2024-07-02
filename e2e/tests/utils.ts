
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { encodeWord } from 'libmime';


const users = {};

export const encodeMailHeader = (header) => {
  return encodeWord(header, 'q').replace('?UTF-8?Q?', '?utf-8?q?');
}

export const login = async (browser, numUsers) => {
  for (let i = 0; i < numUsers; i++) {
    const userId = `user${i}`;
    if (users.hasOwnProperty(userId)) {
      users[userId].context.close();
    }
    const userIdUpper = userId.toUpperCase();
    const userName = process.env[`${userIdUpper}_DISPLAY_NAME`];
    const userEmail = process.env[`${userIdUpper}_EMAIL`];
    const userPass = process.env[`${userIdUpper}_PASS`];
    const withKey = process.env[`${userIdUpper}_SECURITY_KEY`] === "True";
    const utf8Name = process.env[`${userIdUpper}_UTF8_NAME`] === "True";
    let nameForMail = userName;
    if (utf8Name) {
      nameForMail = encodeMailHeader(userName); 
    }
    const context = await browser.newContext({ storageState: `playwright/.auth/${userId}.json`, ignoreHTTPSErrors: true });
    users[userId] = {
      context: context,
      page: await context.newPage(),
      name: userName,
      utf8Name: utf8Name,
      nameForMail: nameForMail,
      email: userEmail,
      pass: userPass,
      key: withKey,
    };
  }
  return users;
};

export const startAtSignPage = async page => {
  await page.goto('/sign');
  for (const rm of await page.getByText('Remove', { exact: true }).all()) {
    await rm.click();
    await page.getByText('Confirm', { exact: true }).click();
  }
};

export const addFile = async (page, filename) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('edusign-dnd-area').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, `fixtures/${filename}`));
};

export const approveForcedPreview = async (page, filename) => {
  await page.getByTestId(`button-forced-preview-${filename}`).click();
  await expect(page.getByRole('dialog')).toContainText(filename);
  await page.getByTestId('preview-button-last-0').click();
  await page.getByTestId('preview-button-confirm-0').click();
};

export const declineForcedPreview = async (page, filename) => {
  await page.getByTestId(`button-forced-preview-${filename}`).click();
  await expect(page.getByRole('dialog')).toContainText(filename);
  await page.getByTestId('preview-button-dissaprove-0').click();
};

export const makeInvitation = async (inviter, invitees, filename, options) => {

  await startAtSignPage(inviter.page);

  await addFile(inviter.page, filename);

  await expect(inviter.page.getByTestId('legend-personal')).toContainText('Personal documents');

  await approveForcedPreview(inviter.page, filename);

  await inviter.page.getByTestId(`button-multisign-${filename}`).click();
  await inviter.page.getByTestId('invitation-text-input').click();
  await inviter.page.getByTestId('invitation-text-input').fill('This is a test invitation');
  if (!options.sendSigned) {
    await inviter.page.getByTestId('sendsigned-choice-input').check();
  }
  if (options.skipFinal) {
    await inviter.page.getByTestId('skipfinal-choice-input').check();
  }
  if (options.ordered) {
    await inviter.page.getByTestId('ordered-choice-input').check();
  }
  if (options.loa) {
    await inviter.page.getByTestId(`loa-radio-${options.loa}`).check();
  }
  await inviter.page.getByTestId('invitees.0.name').click();
  await inviter.page.getByTestId('invitees.0.name').fill(invitees[0].name);
  await inviter.page.getByTestId('invitees.0.email').click();
  await inviter.page.getByTestId('invitees.0.email').fill(invitees[0].email);
  let i = 1;
  for (const invitee of invitees.slice(1)) {
    await inviter.page.getByTestId("button-add-invitation").click();
    await inviter.page.getByTestId(`invitees.${i}.name`).click();
    await inviter.page.getByTestId(`invitees.${i}.name`).fill(invitee.name);
    await inviter.page.getByTestId(`invitees.${i}.email`).click();
    await inviter.page.getByTestId(`invitees.${i}.email`).fill(invitee.email);
    i++;
  }
  await inviter.page.getByTestId(`button-send-invites-${filename}`).click();
};

export const addInvitation = async (inviter, invitee, filename, index) => {

  await inviter.page.getByRole('button', { name: 'Other options' }).click();
  await inviter.page.getByTestId(`menu-item-edit-invitations-${filename}`).click();
  await inviter.page.getByTestId('button-add-invitation').click();
  await inviter.page.getByTestId(`invitees.${index}.name`).fill(invitee.name);
  await inviter.page.getByTestId(`invitees.${index}.email`).fill(invitee.email);
  await inviter.page.getByTestId(`button-save-edit-invitation-${filename}`).click();

  await inviter.page.goto('/sign');
};

export const moveInvitation = async (inviter, filename, ifrom, ito) => {

  await inviter.page.getByRole('button', { name: 'Other options' }).click();
  await inviter.page.getByTestId(`menu-item-edit-invitations-${filename}`).click();

  const fromElem = await inviter.page.getByTestId(`draggable-invitation-field-${ifrom}`);
  const toElem = await inviter.page.getByTestId(`draggable-invitation-field-${ito}`);
  //await fromElem.dragTo(toElem);
  await fromElem.hover();
  await inviter.page.mouse.down();
  await toElem.hover();
  await inviter.page.mouse.up();

  await inviter.page.getByTestId(`button-save-edit-invitation-${filename}`).click();

  await inviter.page.goto('/sign');
};

export const checkInvitation = async (user, inviter, filename) => {
  await user.page.goto('/sign');

  await expect(user.page.getByTestId('legend-invited')).toContainText('Documents you are invited to sign');
  await expect(user.page.getByRole('group')).toContainText(filename);
  await expect(user.page.getByRole('group')).toContainText(`Invited by:${inviter.name} <${inviter.email}>.`);
  await expect(user.page.getByRole('group')).toContainText('Required security level: Low');
}

export const signInvitation = async (user, inviter, filename, draftFilename) => {
  await checkInvitation(user, inviter, filename);

  await approveForcedPreview(user.page, filename);
  await user.page.getByTestId('button-sign').click();

  await user.page.getByPlaceholder('enter password').fill(user.pass);
  await user.page.getByRole('button', { name: 'Log in' }).click();
  if (user.key) {
    await user.page.getByRole('button', { name: 'Use my security key' }).click();
  }
  if (draftFilename) {
    await expect(user.page.locator(`[id="local-doc-${draftFilename}"]`)).toContainText(draftFilename);
    await expect(user.page.getByTestId(`button-download-signed-${draftFilename}`)).toContainText('Download (signed)');
  }
}

export const addFinalSignature = async (user, filename) => {
  await user.page.goto('/sign');

  await user.page.getByTestId(`doc-selector-${filename}`).check();
  await user.page.getByTestId('button-sign').click();
  await user.page.getByPlaceholder('enter password').fill(user.pass);
  await user.page.getByRole('button', { name: 'Log in' }).click();
  if (user.key) {
    await user.page.getByRole('button', { name: 'Use my security key' }).click();
  }
}

export const declineInvitation = async (user, inviter, filename) => {
  await checkInvitation(user, inviter, filename);
  await declineForcedPreview(user.page, filename);
  await expect(user.page.locator(`[id="invitee-doc-${filename}"]`)).toContainText('You have declined to sign this document');
}

export const rmDocument = async (user, filename, type) => {
  await user.page.getByTestId(`button-rm-${type}-${filename}`).click();
  await user.page.getByTestId(`confirm-remove-${filename}-confirm-button`).click();
  await expect(user.page.locator('#contact-local-it-msg')).toContainText('If you experience problems with eduSign contact your local IT-support');
}
