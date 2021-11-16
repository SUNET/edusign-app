import React from "react";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import { ESTooltip } from "containers/Overlay";

import { humanFileSize } from "components/utils";
import LittleSpinner from "components/LittleSpinner";

export const docName = (doc) => {
  return <div className="name-flex-item">{doc.name}</div>;
};
export const docSize = (doc) => {
  return <div className="size-flex-item">{humanFileSize(doc.size)}</div>;
};

export const namedSpinner = (index, name) => {
  return (
    <>
      <LittleSpinner index={index} />
      <div className="spinning-flex-item">{` ${name} ...`}</div>
    </>
  );
};

export const selectDoc = (props, doc) => {
  return (
    <>
      <div className="doc-selector-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Select the document for signing"
              key="select-doc-tootip"
            />
          }
        >
          <input
            type="checkbox"
            data-testid={"doc-selector-" + doc.name}
            onChange={props.handleDocSelection(doc.name)}
            checked={doc.state === "selected"}
          />
        </ESTooltip>
      </div>
    </>
  );
};
export const dummySelectDoc = () => {
  return (
    <>
      <div className="doc-selector-flex-item" />
    </>
  );
};

export const skipSignatureButton = (props, doc) => {
  return (
    <>
      <div className="button-skip-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="All requested users have alredy signed the document, click here to skip adding your final signature"
              key="owned-skip-button-help"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handleSkipSigning(doc, props)}
          >
            <FormattedMessage
              defaultMessage="Skip Signature"
              key="skip-sign-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const resendButton = (props, doc) => {
  return (
    <>
      <div className="button-resend-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Click here to re-send an invitation email to all pending users"
              key="owned-resend-button-help"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            data-testid={"button-open-resend-" + doc.name}
            onClick={props.handleResend(doc)}
          >
            <FormattedMessage
              defaultMessage="Resend invitations"
              key="resend-invitations-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const previewButton = (props, doc) => {
  return (
    <>
      <div className="button-preview-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Display a preview of the unsigned document"
              key="preview-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handlePreview(doc.key)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const forcedPreviewButton = (props, doc) => {
  return (
    <>
      <div className="button-forced-preview-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="You need to approve all documents for signature"
              key="forced-preview-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            data-testid={"button-forced-preview-" + doc.name}
            size="sm"
            onClick={props.handleForcedPreview(doc.key)}
          >
            <FormattedMessage
              defaultMessage="Preview and approve for signature"
              key="forced-preview-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const removeConfirmButton = (props, doc, id) => {
  if (id === undefined) {
    id = "confirm-remove-owned-" + doc.name;
  }
  return (
    <>
      <div className="button-remove-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Cancel Request"
              key="owned-close-button-help"
            />
          }
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.showConfirm(id)}
            data-testid={"rm-invitation-" + doc.name}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const removeButton = (props, doc) => {
  return (
    <>
      <div className="button-remove-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Discard document"
              key="button-remove-tootip"
            />
          }
        >
          <Button
            variant="outline-danger"
            size="sm"
            data-testid={"rm-button-" + doc.name}
            onClick={props.handleRemove(doc.name)}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const downloadSignedButton = (props, doc) => {
  return (
    <>
      <div className="button-download-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Download signed document. Be sure to save the original rather than a copy."
              key="button-download-tootip"
            />
          }
        >
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleDlSigned(doc.name)}
          >
            <FormattedMessage
              defaultMessage="Download (signed)"
              key="dlsigned-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const retryButton = (props, doc) => {
  return (
    <>
      <div className="button-retry-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Try again to prepare the document for signing"
              key="retry-button-tootip"
            />
          }
        >
          <Button
            variant="outline-success"
            data-testid={"button-retry-" + doc.name}
            size="sm"
            onClick={props.handleRetry(doc, props)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const multiSignButton = (props, doc) => {
  if (
    !["Yes", "yes", "True", "true", "T", "t"].includes(props.multisign_buttons)
  ) {
    return "";
  }
  return (
    <>
      <div className="button-multisign-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Invite other users to sign the document. After all invitees sign, you'll be offered the chance to add a final signature."
              key="button-multisign-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            data-testid={"button-multisign-" + doc.name}
            size="sm"
            onClick={props.openInviteForm(doc)}
            data-docid={doc.id}
          >
            <FormattedMessage
              defaultMessage="Invite others to sign"
              key="multisign-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const showMessage = (doc) => {
  return (
    <>
      <div className="message-flex-item">
        <span alt={doc.message}>{doc.message}</span>
      </div>
    </>
  );
};

export const declineSignatureButton = (props, doc) => {
  return (
    <>
      <div className="button-decline-flex-item">
        <ESTooltip
          tooltip={
            <FormattedMessage
              defaultMessage="Click here to decline your invitation to sign this document."
              key="invited-decline-button-help"
            />
          }
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.handleDeclineSigning({ doc: doc, intl: props.intl })}
          >
            <FormattedMessage
              defaultMessage="Decline Signature"
              key="decline-sign-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};
export const dummyButton = (doc) => {
  return (
    <>
      <div className="button-dummy-flex-item"></div>
    </>
  );
};
