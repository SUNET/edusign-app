
import * as path from 'path';
import { test, expect } from '@playwright/test';


const users = {};

export const login = async (browser, numUsers) => {
  for (let i = 0; i < numUsers; i++) {
    const userId = `user${i}`;
    if (!users.hasOwnProperty(userId)) {
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
        email: userEmail,
        pass: userPass,
        key: withKey,
      };
    }
  }
  return users;
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
