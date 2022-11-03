import React from "react";
import { FormattedMessage } from "react-intl";
import ESDropdownItem from "containers/DropdownItem";

export const createTemplateMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    onClick={props.handleCreateTemplate(doc.key, props)}
    id={"menu-item-create-template-" + doc.key}
  >
    <FormattedMessage
      defaultMessage="Create template"
      key="create-template-menu-item"
    />
  </ESDropdownItem>
);

export const editInvitationMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
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
    doc={doc}
    id={"menu-item-open-resend-" + doc.name}
    disabling={true}
    onClick={props.handleResend(doc)}
  >
    <FormattedMessage
      defaultMessage="Send reminder"
      key="resend-invitations-button"
    />
  </ESDropdownItem>
);

export const previewMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    id={"menu-item-preview-" + doc.name}
    disabling={true}
    onClick={props.handlePreview(doc.key)}
  >
    <FormattedMessage defaultMessage="Preview" key="preview-button" />
  </ESDropdownItem>
);

export const previewTemplateMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    id={"menu-item-preview-" + doc.name}
    disabling={true}
    onClick={props.handleTemplatePreview(doc.key)}
  >
    <FormattedMessage defaultMessage="Preview" key="preview-button" />
  </ESDropdownItem>
);

export const multiSignMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    id={"menu-item-multisign-" + doc.name}
    disabling={true}
    onClick={props.openInviteForm(doc)}
  >
    <FormattedMessage
      defaultMessage="Invite others to sign"
      key="multisign-button"
    />
  </ESDropdownItem>
);

export const downloadDraftMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    id={"menu-item-dldraft-" + doc.name}
    disabling={true}
    onClick={props.handleDlDraft({
      docName: doc.name,
      intl: props.intl,
    })}
  >
    <FormattedMessage defaultMessage="Download (draft)" key="dldraft-button" />
  </ESDropdownItem>
);

export const fillFormMenuItem = (props, doc) => (
  <ESDropdownItem
    doc={doc}
    id={"menu-item-fillform-" + doc.name}
    disabling={true}
    onClick={props.handleFillForm(doc.key)}
  >
    <FormattedMessage defaultMessage="Fill form" key="fillform-button" />
  </ESDropdownItem>
);
