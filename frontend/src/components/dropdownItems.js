
import React from "react";
import { FormattedMessage } from "react-intl";
import ESDropdownItem from "containers/DropdownItem";

export const createTemplateMenuItem = (props, doc) => (
  <ESDropdownItem
    onClick={props.handleCreateTemplate(doc.key, props)}
    id={"menu-item-skipping-" + doc.key}
  >
    <FormattedMessage
      defaultMessage="Create template"
      key="create-template-menu-item"
    />
  </ESDropdownItem>
);

export const skipSignatureMenuItem = (props, doc) => (
  <ESDropdownItem
    id={"menu-item-skipping-" + doc.key}
    disabling={true}
    onClick={props.handleSkipSigning(doc, props)}
  >
    <FormattedMessage
      defaultMessage="Skip Signature"
      key="skip-sign-menu-item"
    />
  </ESDropdownItem>
);

export const editInvitationMenuItem = (props, doc) => (
  <ESDropdownItem
    id={"menu-item-edit-invitations-" + doc.key}
    disabling={true}
    onClick={props.openEditInvitationForm(doc)}
  >
    <FormattedMessage
      defaultMessage="Edit invitations"
      key="edit-invitations-menu-item"
    />
  </ESDropdownItem>
);

export const resendMenuItem = (props, doc) => (
  <ESDropdownItem
    id={"menu-item-open-resend-" + doc.name}
    disabling={true}
    onClick={props.handleResend(doc)}
  >
    <FormattedMessage
      defaultMessage="Resend invitations"
      key="resend-invitations-button"
    />
  </ESDropdownItem>
);
