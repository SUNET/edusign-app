import React from "react";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import Button from "containers/Button";
import { humanFileSize } from "components/utils";
import LittleSpinner from "components/LittleSpinner";
import ConfirmDialogContainer from "containers/ConfirmDialog";

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
          helpId={"doc-selector-" + doc.name}
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
          helpId={"button-skipping-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="All requested users have answered your invitation to sign the document, click here to skip adding your final signature"
              key="owned-skip-button-help"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            id={"button-skipping-" + doc.key}
            disabling={true}
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

export const editInvitationButton = (props, doc) => {
  return (
    <>
      <div className="button-edit-invitations-flex-item">
        <ESTooltip
          helpId={"button-edit-invitations-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Click here to edit the invitations"
              key="owned-edit-invitations-button-help"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            id={"button-edit-invitations-" + doc.key}
            disabling={true}
            onClick={props.openEditInvitationForm(doc)}
          >
            <FormattedMessage
              defaultMessage="Edit invitations"
              key="edit-invitations-button"
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
          helpId={"button-open-resend-" + doc.name}
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
            id={"button-open-resend-" + doc.name}
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
          helpId={"button-preview-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Display a preview of the document"
              key="preview-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            id={"button-preview-" + doc.key}
            size="sm"
            disabling={true}
            onClick={props.handlePreview(doc.key)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const createTemplateButton = (props, doc) => {
  return (
    <>
      <div className="button-create-template-flex-item">
        <ESTooltip
          helpId={"button-create-template-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Create a template out of this document"
              key="create-template-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            id={"button-create-template-" + doc.key}
            size="sm"
            disabling={true}
            onClick={props.handleCreateTemplate(doc.key)}
          >
            <FormattedMessage defaultMessage="Create template" key="create-template-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const previewTemplateButton = (props, doc) => {
  return (
    <>
      <div className="button-preview-flex-item">
        <ESTooltip
          helpId={"button-preview-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Display a preview of the document"
              key="preview-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            id={"button-preview-" + doc.key}
            size="sm"
            disabling={true}
            onClick={props.handleTemplatePreview(doc.key)}
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
          helpId={"button-forced-preview-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="You need to approve all documents before they can be signed"
              key="forced-preview-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            id={"button-forced-preview-" + doc.key}
            size="sm"
            disabling={true}
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
          helpId={id}
          tooltip={
            <FormattedMessage
              defaultMessage="Remove document"
              key="owned-remove-button-help"
            />
          }
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.showConfirm(id)}
            id={"button-rm-invitation-" + doc.key}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const removeTemplate = (props, doc) => {
  const id = "confirm-remove-template-" + doc.name;
  return (
    <>
      <div className="button-remove-flex-item">
        <ESTooltip
          helpId={id}
          tooltip={
            <FormattedMessage
              defaultMessage="Remove template"
              key="template-remove-button-help"
            />
          }
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.showConfirm(id)}
            id={"button-rm-template-" + doc.key}
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
          helpId={"rm-button-" + doc.name}
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
          helpId={"button-download-signed-" + doc.key}
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
            id={"button-download-signed-" + doc.key}
            disabling={true}
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
          helpId={"button-retry-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Try again to prepare the document for signing"
              key="retry-button-tootip"
            />
          }
        >
          <Button
            variant="outline-success"
            id={"button-retry-" + doc.key}
            disabling={true}
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
          helpId={"button-multisign-" + doc.key}
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
          helpId={"button-decline-" + doc.key}
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
            id={"button-decline-" + doc.key}
            disabling={true}
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

export const delegateButton = (props, doc) => {
  return (
    <>
      <div className="button-delegate-flex-item">
        <ESTooltip
          helpId={"button-delegate-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Click here to delegate the signature of this document to someone else."
              key="invited-delegate-button-help"
            />
          }
        >
          <Button
            variant="outline-dark"
            size="sm"
            id={"button-delegate-" + doc.key}
            disabling={true}
            onClick={props.handleDelegateSigning(doc.key)}
          >
            <FormattedMessage
              defaultMessage="Delegate"
              key="delegate-sign-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const buttonSignSelected = (disableSigning, onClick) => {
  return (
    <div className="button-sign-flex-item">
      <ESTooltip
        helpId="button-sign-selected"
        tooltip={
          <FormattedMessage
            defaultMessage="Select documents above and click here to send them for signing."
            key="button-sign-tootip"
          />
        }
      >
        <div id="button-sign-wrapper">
          <Button
            variant="success"
            id="button-sign"
            size="lg"
            disabled={disableSigning}
            style={disableSigning ? { pointerEvents: "none" } : {}}
            onClick={onClick}
          >
            <FormattedMessage
              defaultMessage="Sign Selected Documents"
              key="sign-selected-button"
            />
          </Button>
        </div>
      </ESTooltip>
    </div>
  );
};

export const buttonDownloadAll = (disableDlAllButton, onClick) => {
  return (
    <div className="button-dlall-flex-item">
      <ESTooltip
        helpId="button-dlall"
        tooltip={
          <FormattedMessage
            defaultMessage="Download all signed documents."
            key="button-dlall-tootip"
          />
        }
      >
        <div id="button-dlall-wrapper">
          <Button
            variant="success"
            id="button-dlall"
            disabled={disableDlAllButton}
            data-testid="button-dlall"
            style={disableDlAllButton ? { pointerEvents: "none" } : {}}
            size="lg"
            onClick={onClick}
          >
            <FormattedMessage
              defaultMessage="Download All Signed"
              key="dlall-selected-button"
            />
          </Button>
        </div>
      </ESTooltip>
    </div>
  );
};

export const buttonClearPersonal = (
  disableClearButton,
  onClick,
  clearDb,
  intl
) => {
  return (
    <div className="button-clear-flex-item">
      <ESTooltip
        helpId="clear-session-button"
        tooltip={
          <FormattedMessage
            defaultMessage='Discard all documents in the "Personal documents" list above'
            key="clear-docs-tootip"
          />
        }
      >
        <div id="button-clear-wrapper">
          <Button
            variant="primary"
            id="clear-session-button"
            disabled={disableClearButton}
            size="lg"
            style={disableClearButton ? { pointerEvents: "none" } : {}}
            onClick={onClick}
          >
            <FormattedMessage
              defaultMessage="Clear Personal Documents List"
              key="clear-session-button"
            />
          </Button>
        </div>
      </ESTooltip>
      <ConfirmDialogContainer
        confirmId="confirm-clear-session"
        title={intl.formatMessage({
          defaultMessage: "Confirm Clear List",
          id: "header-confirm-clear-title",
        })}
        mainText={intl.formatMessage({
          defaultMessage:
            'Clicking "Confirm" will remove all documents from your list',
          id: "header-confirm-clear-text",
        })}
        confirm={clearDb}
      />
    </div>
  );
};
