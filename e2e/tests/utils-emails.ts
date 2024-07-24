import { test, expect } from '@playwright/test';
import { encodeMailHeader } from "./utils.ts";

export const checkEmails = async (page, specs) => {
  await page.goto('/sign/emails');
  const json = await page.locator('pre').allInnerTexts();
  const contents = JSON.parse(json);
  await expect(contents.error).toBe(false);
  const emails = contents.payload.messages;

  const emailTests = [];
  specs.forEach(spec => {
    const [fun, inviter, invitees, filename, ...more] = spec;
    let moreArgs = {};
    if (more.length === 1) {
      moreArgs = more[0];
    }
    emailTests.push(emailSpecs[fun](inviter, invitees, filename, moreArgs));
  });

  try {
    await expect(emails.length).toBe(emailTests.length);
  } catch(err) {
    console.log(JSON.stringify(emails));
    throw(err);
  }
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i].message;
    const emailTest = emailTests[i];
    await expect(email).toContain(`Subject: ${emailTest.subject}`);
    await expect(email).toContain(`To: ${emailTest.to}`);
    for (const text of emailTest.body) {
      await expect(email).toContain(text);
    }
    await expect(email).toContain("This is an email from eduSign, a service for secure digital signatures, developed by Sunet.");
  }
  await page.goto('/sign');
};

const getRecipients = invitees => {
  let recipients = `${invitees[0].nameForMail} <${invitees[0].email}>`
  invitees.slice(1).forEach(invitee => {
    recipients += `,\n ${invitee.nameForMail} <${invitee.email}>`;
  });
  return recipients;
};

const emailSpecs = {

  "invitation": (inviter, invitees, filename, more) => {

    const recipients = getRecipients(invitees);
    const emailTest = {
      to: recipients,
      subject: `You have been invited to sign "${filename}"`,
      body: [
        `You have been invited by ${inviter.name} <${inviter.email}>`,
        `to digitally sign a document named "${filename}"`,
        "Follow this link to preview and sign the document:",
      ],
    };
    return emailTest;
  },
  "signed": (inviter, invitees, filename, more) => {

    const invitee = invitees[0];
    let subject = `${invitee.name} signed '${filename}'`;
    if (invitee.utf8Name) {
      subject = encodeMailHeader(subject);
    }
    const recipients = getRecipients([inviter]);
    const emailTest = {
      to: recipients,
      subject: subject,
      body: [
        `${invitee.name} <${invitee.email}> has signed the document "${filename}"`,
      ],
    };
    return emailTest;
  },
  "signed-last": (inviter, invitees, filename, more) => {

    const invitee = invitees[0];
    let subject = `${invitee.name} signed '${filename}'`
    if (invitee.utf8Name) {
      subject = encodeMailHeader(subject)
    }
    const recipients = getRecipients([inviter]);
    const emailTest = {
      to: recipients,
      subject: subject,
      body: [
        `${invitee.name} <${invitee.email}> has signed the document "${filename}"`,
        `This was the final reply to your invitation to sign this document.`,
        `Please visit eduSign to finalize the signature process.`,
        `This is an email from eduSign, a service for secure digital signatures, developed by Sunet.`,
      ],
    }
    return emailTest;
  },
  "declined": (inviter, invitees, filename, more) => {

    const invitee = invitees[0];
    let subject = `${invitee.name} declined to sign '${filename}'`;
    if (invitee.utf8Name) {
      subject = encodeMailHeader(subject);
    }
    const recipients = getRecipients([inviter]);
    const emailTest = {
      to: recipients,
      subject: subject,
      body: [
        `${invitee.name} <${invitee.email}> has declined to sign document "${filename}".`,
      ],
    };
    if (more.last && more.skip) {
      emailTest.body.push("This was the final reply to your invitation to sign this document.");
    } else if (more.last) {
      emailTest.body.push("This was the final reply to your invitation to sign this document. Please visit eduSign to finalize the signature process.");
    }
    return emailTest;
  },
  "cancellation": (inviter, invitees, filename, more) => {

    const recipients = getRecipients(invitees);
    const emailTest = {
      to: recipients,
      subject: `Cancellation of invitation to sign '${filename}'`,
      body: [
        `This is to inform you that ${inviter.name} <${inviter.email}>`,
        `has cancelled an invitation to digitally sign a document named "${filename}".`,
      ],
    };
    return emailTest;
  },
  "final-attached": (inviter, invitees, filename, more) => {

    const recipients = getRecipients([inviter, ...invitees]);
    const emailTest = {
      to: recipients,
      subject: `"${filename}" is now signed`,
      body: [
        `The document "${filename}" is now signed by all parties and attached to this email.`,
        `Content-Disposition: attachment; filename="${more.signedFilename}"`,
      ],
    };
    return emailTest;
  },
  "final-not-attached": (inviter, invitees, filename, more) => {

    const recipients = getRecipients([inviter, ...invitees]);
    const emailTest = {
      to: recipients,
      subject: `"${filename}" is now signed`,
      body: [
        `The document "${filename}" is now signed by all parties.`,
        `The person who invited you chose not to send out the signed document automatically from eduSign.`,
      ],
    };
    return emailTest;
  },
};
