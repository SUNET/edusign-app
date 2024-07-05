
# Relation of e2e tests

### [Authentication](tests/auth.setup.ts)

We authenticate with 5 different identities, which are set at `e2e/users-env`.

### [Anonymous home page](tests/home-anon.spec.ts)

- Visit home page at `/`
- Check elements in the page: title, logo, SeamlessAccess button, texts, links.

### [Initial UI](tests/initial-ui.spec.ts)

- Visit initial authenticated empty UI at `/sign`
- Check elements in the page: Title, logos, heading, upload widget, texts, buttons, footer.

### [Create template and fill PDF form](tests/fill-pdf-form.spec.ts)

- load PDF document with form
- Save it as template
- Fill form in template
- Check that there is new personal document created from template
- Remove both template and personal document

### [Ordered invitation for four](tests/invite-four-ordered-reorder.spec.ts)

- Load PDF document
- Invite 4 people to sign it, using workflow for the signatures
- Check invitation email to 1st invitee
- Check presence of the message "Waiting for signatures by" the 4 invitees
- Sign the document as the 1st invitee
- Check email sent to inviter informing of the signature by the 1st invitee,
  and invitation email sent to 2nd invitee
- Check presence of message "Waiting for signatures by" the 3 pending invitees,
  and of message "Signed by" 1st invitee, and of "Required security level"
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
  of  message "Declined to sign by:" the invitee, of message "Required security
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
  of  message "Signed by:" the invitee, of message "Required security
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
  of  message "Signed by:" the invitee, of message "Required security
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
  of  message "Signed by:" the invitee, of message "Required security
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
  of  message "Signed by:" the invitee, of message "Required security
  level: Low", and of buttons to download signed, to invite others to sign,
  and to remove the document
- Remove document

### [](tests/)

### [](tests/)

### [](tests/)

### [](tests/)

### [](tests/)

### [](tests/)

### [](tests/)
