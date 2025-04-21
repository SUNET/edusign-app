
# Relation of e2e tests

### [Authentication](tests/auth.setup.ts)

We authenticate with 5 different identities, which are set at `e2e/users-env`.

### [Anonymous home page](tests/home-anon.spec.ts)

- Visit home page at `/`
- Check elements in the page: title, logo, SeamlessAccess button, texts, links.

### [Initial UI](tests/initial-ui.spec.ts)

- Visit initial authenticated empty UI at `/sign`
- Check elements in the page: Title, logos, heading, upload widget, texts, buttons, footer.

### [Load and remove document](tests/load-remove-pdf.spec.ts)

- Load a PDF, preview and approve it
- Remove document
- Check there is no document represented in the UI

### [Load signed PDF document](tests/load-signed-pdf.spec.ts)

- Load a previously signed PDF
- Check presence of the text "Previously signed by"
- Remove document

### [Load corrupted PDF](tests/load-corrupted-pdf.spec.ts)

- Load a corrupted PDF
- Check presence of the text "Document seems corrupted"
- Remove document

### [Load duplicate PDF document](tests/load-duplicate-name.spec.ts)

- Load PDF document
- Try to load same document again
- Check presence of the text "A document with that name has already been loaded"
- Remove document

### [Load encrypted PDF document](tests/load-encrypted-pdf.spec.ts)

- Load an encrypted PDF
- Check presence of the text "Failed to insert sign page"
- Remove document

### [Load password protected PDF document](tests/load-password-pdf.spec.ts)

- Load a password protected PDF
- Check presence of the text "Please do not supply a password protected document"
- Remove document

### [Navigate preview of multi page PDF document](tests/multi-page-pdf.spec.ts)

- Load a multi-page PDF
- Click on "Preview and approve"
- Check presence of controls to navigate, approve and reject the PDF
- Check that it is possible to navigate the PDF using those controls
- Approve the PDF for signature
- Click on "preview"
- Check presence of controls to navigate, approve and reject the PDF
- Check that it is possible to navigate the PDF using those controls
- Close preview
- Remove document

### [Load and reject PDF document](tests/reject-single.spec.ts)

- Load PDF document
- Check presence of text "Personal Documents"
- Click on "Preview and approve"
- Click on "Reject"
- Check there is no document represented in the UI

### [Sign one test XML document](tests/sign-simple-xml.spec.ts)

- Load XML document
- Check document is represented in the UI
- Click on "Preview and approve"
- Check that the document contents are shown in the preview
- Click on "Approve"
- Sign the document
- Check presence of text "Signed by:"
- Preview the signed document
- Check the the preview now includes the signature
- Remove the document

### [Sign one test PDF document](tests/sign-single-pdf.spec.ts)

- Load PDF document
- Check document is represented in the UI
- Click on "Preview and approve"
- Check that the document contents are shown in the preview
- Click on "Approve"
- Sign the document
- Check presence of text "Signed by:"
- Check presence of button to download the signed document
- Remove the document
- Repeat the test, with a document name including non-ascii characters

### [Create template and fill PDF form](tests/fill-pdf-form.spec.ts)

- load PDF document with form
- Save it as template
- Fill form in template
- Check that there is new personal document created from template
- Remove both template and personal document

### [Cancel one invitation](tests/invite-one-cancel.spec.ts)

- Load PDF document
- Invite one user to sign it
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As inviter user, remove invitation
- Check cancellation email sent to invitee

### [Decline one invitation skipping last signature](tests/invite-one-defaults-decline-skip.spec.ts)

- Load PDF document
- Invite one user to sign it, checking "Finalise signature flow automatically"
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, decline the invitation
- Check email sent to inviter informing of non signature by invitee,
  and final email with (non) signed document sent to inviter. XXX
- As inviter user, remove document

### [Decline one invitation](tests/invite-one-defaults-decline.spec.ts)

- Load PDF document
- Invite one user to sign it
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, decline the invitation
- Check email sent to inviter informing of non signature by invitee
- Check presence of text "Documents you have invited others to sign",
  of  message "Declined to sign by:" the invitee, of message "Required assurance
  level: Low", and of buttons to skip final signature and to remove document.
- As inviter, click on "Skip Signature" button
- Check document in "personal documents"
- Check presence of buttons to "Invite others to sign" and "Download (signed)"
- Check final email with (non) signed document attached. XXX
- As inviter user, remove document

### [Invite one and skip final signature](tests/invite-one-defaults-skip.spec.ts)

- Load PDF document
- Invite one user to sign it
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, sign the invitation
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee, of message "Required assurance
  level: Low", and of buttons to skip final signature and to remove document.
- As inviter, click on "Skip Signature" button
- Check document in "personal documents"
- Check presence of buttons to "Invite others to sign" and "Download (signed)"
- Check final email with signed document attached
- As inviter user, remove document

### [Sign one invitation](tests/invite-one-defaults.spec.ts)

- Load PDF document
- Invite one user to sign it
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, sign the invitation
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee, of message "Required assurance
  level: Low", and of buttons to skip final signature and to remove document.
- Add final signature as inviter
- Check presence of button "Download (signed)"
- Check email sent to all that signed, with the signed document attached
- Remove document

### [One invitation with medium LoA](tests/invite-one-medium-loa.spec.ts)

- Load PDF document
- Invite one user to sign it, requiring "medium" level of assurance
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- In the invitee UI, check the presence of the message "You do not have the
  required level of assurance on your identity, please make sure to provide
  'Medium' level"
- As inviter user, remove invitation
- Check cancellation email sent to invitee

### [One invitation without sending final signed PDF](tests/invite-one-nosendfinal.spec.ts)

- Load PDF document
- Invite one user to sign it, unchecking "Send signed document in email"
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, sign the invitation
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee, of message "Required assurance
  level: Low", and of buttons to skip final signature and to remove document.
- Add final signature as inviter
- Check presence of button "Download (signed)"
- Check email sent to all that signed, without the signed document attached
- Remove document

### [Invite one skipping last signature](tests/invite-one-skip.spec.ts)

- Load PDF document
- Invite one user to sign it, checking "Finalise signature flow automatically"
- Check invitation email to invitee
- Check presence of message "Waiting for signatures by" the invitee
- As invitee, sign the invitation
- Check email sent to all that signed, with the signed document attached
- Check presence of text "Personal documents" in invitee UI
- Check presence of text "Personal documents",
  of  message "Signed by:" the invitee, of message "Required assurance
  level: Low", and of buttons to download signed, to invite others to sign,
  and to remove the document
- Remove document

### [Invite two, sign as one invitee, then remove the other invitation](tests/invite-two-defaults-cancel-last.spec.ts)

- Load PDF document
- Invite two users to sign it
- Check invitation email to invitees
- Check presence of message "Waiting for signatures by" the invitees
- As one of the invitees, sign the invitation
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed, of message
  "Waiting for signatures by" the other invitees, of message "Required assurance
  level: Low", and of a button to remove the document
- Edit the invitation to remove the pending invitee
- Check cancellation email sent to removed invitee
- Check presence of text "Signed by:" the invitee that has signed
- Add final signature as inviter
- Check presence of button "Download (signed)" and button "Invite others to sign"
- Check email sent to all that signed, with the signed document attached
- Remove document

### [Make two invitations and sign them](tests/invite-two-defaults-sign-all.spec.ts)

- Load PDF document
- Invite two users to sign it
- Check invitation email to invitees
- Check presence of message "Waiting for signatures by" the invitees
- As one of the invitees, sign the invitation
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed, of message
  "Waiting for signatures by" the other invitees, of message "Required assurance
  level: Low", and of a button to remove the document
- Sign document as the pending invitee
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Signed by:" the invitees
- Add final signature as inviter
- Check presence of button "Download (signed)" and button "Invite others to sign"
- Remove document
- Check email sent to all that signed, with the signed document attached

### [Make two ordered invitations and sign them](tests/invite-two-ordered-sign-all.spec.ts)

- Load PDF document
- Invite two people to sign it, using workflow for the signatures
- Check invitation email to 1st invitee
- Check presence of the message "Waiting for signatures by" the 2 invitees
- Sign the document as the 1st invitee
- Check email sent to inviter informing of the signature by the 1st invitee,
  and invitation email sent to 2nd invitee
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed, of message
  "Waiting for signatures by" the other invitee, of message "Required assurance
  level: Low", and of a button to remove the document
- Sign invitation as 2nd invitee
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of the message "Signed by" the two signataries
- Add final signature as inviter
- Check presence of button "Download (signed)" and button "Invite others to sign"
- Remove document
- Check email sent to all that signed, with the signed document attached

### [Make two invitations, sign one, edit to avoid sending the signed PDF, sign all](tests/invite-two-sendfinal-edit.spec.ts)

- Load PDF document
- Invite two users to sign it
- Check invitation email to invitees
- Check presence of message "Waiting for signatures by" the invitees
- As one of the invitees, sign the invitation
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed, of message "Required
  assurance level: Low", and of a button to remove the document
- Edit invitation and uncheck "Send signed document in email"
- Check presence of text "Signed by:" the invitee that has signed, and of text
  "Waiting for signatures by" the other invitee
- Sign document as the pending invitee
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Signed by:" the invitees
- Add final signature as inviter
- Check presence of button "Download (signed)" and button "Invite others to sign"
- Remove document
- Check email sent to all that signed, with the signed document attached

### [Invite three, sign one, decline one, invite another, sign all](tests/invite-threeplusone-defaults-sign-three.spec.ts)

- Load PDF document
- Invite three users to sign it
- Check invitation email to invitees
- Check presence of message "Waiting for signatures by" the invitees
- As one of the invitees, sign the invitation
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed, of message
  "Waiting for signatures by" the other invitees, of message "Required assurance
  level: Low", and of a button to remove the document
- As another invitee, decline the invitation
- Check email sent to inviter informing of non signature by invitee
- Check presence of text "Documents you have invited others to sign",
  of  message "Signed by:" the invitee that has signed the document,
  of  message "Declined to sign by:" the invitee that has declined the
  invitation, and of message "Waiting for signatures by" the other invitee
- Edit the invitation to add another invitee
- Check invitation email to new invitee
- Check the presence of text "Waiting for signatures by" now 2 pending invitees
- Sign document as one of the pending invitees
- Check email sent to inviter informing them that the invitee has signed
  the document
- Sign document as the last pending invitee
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of text "Signed by:" the three invitees that have signed
  the document, and of message "Declined to sign by:" the invitee that has
  declined the invitation
- Remove document
- Check email sent to all that signed, with the signed document attached

### [Ordered invitation for four](tests/invite-four-ordered-reorder.spec.ts)

- Load PDF document
- Invite 4 people to sign it, using workflow for the signatures
- Check invitation email to 1st invitee
- Check presence of the message "Waiting for signatures by" the 4 invitees
- Sign the document as the 1st invitee
- Check email sent to inviter informing of the signature by the 1st invitee,
  and invitation email sent to 2nd invitee
- Check presence of message "Waiting for signatures by" the 3 pending invitees,
  and of message "Signed by" 1st invitee, and of "Required assurance level"
  message, and of "Remove" button
- Edit invitation to remove next (2nd) invitee
- Check cancellation email sent to 2nd invitee, and invitation email sent to
  3rd invitee
- Sign invitation as 3rd invitee
- Check email sent to inviter informing of the signature by the 3rd invitee,
  and invitation email sent to 4nd invitee
- Sign invitation as 4th invitee
- Check email sent to inviter informing them that the last invitee has signed
  the document
- Check presence of the message "Signed by" the three signataries
- Add final signature as inviter
- Check presence of button "Download (signed)"
- Check email sent to all that signed, with the signed document attached
- Remove document
