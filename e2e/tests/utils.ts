
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { encodeWord } from 'libmime';


const users = {};

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
    const context = await browser.newContext({ storageState: `playwright/.auth/${userId}.json` });
    users[userId] = {
      context: context,
      page: await context.newPage(),
      name: userName,
      nameMime: encodeWord(userName, 'q').replace('?UTF-8?Q?', '?utf-8?q?'),
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
  await page.getByTestId('preview-button-confirm-0').click();
};

export const checkEmails = async (page, emailTests) => {
  await page.goto('/sign/emails');
  const json = await page.locator('pre').allInnerTexts();
  const contents = JSON.parse(json);
  await expect(contents.error).toBe(false);
  const emails = contents.payload.messages;
  await expect(emails.length).toBe(emailTests.length);
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i].message;
    const emailTest = emailTests[i];
    await expect(email).toContain(`Subject: ${emailTest.subject}`);
    await expect(email).toContain(`To: ${emailTest.to}`);
    emailTest.body.forEach(async text => {
      await expect(email).toContain(text);
    });
    await expect(email).toContain("This is an email from eduSign, a service for secure digital signatures, developed by Sunet.");
  }
  await page.goBack();
};
