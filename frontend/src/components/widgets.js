import React from "react";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "containers/Overlay";
import Tooltip from "react-bootstrap/Tooltip";

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
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Select the document for signing"
                key="select-doc-tootip"
              />
            </Tooltip>
          )}
        >
          <input
            type="checkbox"
            data-testid={"doc-selector-" + doc.name}
            onChange={props.handleDocSelection(doc.name)}
            checked={doc.state === "selected"}
          />
        </OverlayTrigger>
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
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="All requested users have alredy signed the document, click here to skip adding your final signature"
                key="owned-skip-button-help"
              />
            </Tooltip>
          )}
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
        </OverlayTrigger>
      </div>
    </>
  );
};

export const resendButton = (props, doc) => {
  return (
    <>
      <div className="button-resend-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Click here to re-send an invitation email to all pending users"
                key="owned-resend-button-help"
              />
            </Tooltip>
          )}
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
        </OverlayTrigger>
      </div>
    </>
  );
};

export const previewButton = (props, doc) => {
  return (
    <>
      <div className="button-preview-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Display a preview of the unsigned document"
                key="preview-button-tootip"
              />
            </Tooltip>
          )}
        >
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handlePreview(doc.key)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </OverlayTrigger>
      </div>
    </>
  );
};
export const forcedPreviewButton = (props, doc) => {
  return (
    <>
      <div className="button-forced-preview-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="You need to approve all documents for signature"
                key="forced-preview-button-tootip"
              />
            </Tooltip>
          )}
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
        </OverlayTrigger>
      </div>
    </>
  );
}

export const removeConfirmButton = (props, doc, help) => {
  return (
    <>
      <div className="button-remove-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Cancel Request"
                key="owned-close-button-help"
              />
            </Tooltip>
          )}
        >
          <>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={props.showConfirm("confirm-remove-owned-" + doc.name)}
              data-testid={"rm-invitation-" + doc.name}
            >
              <FormattedMessage defaultMessage="Remove" key="remove-button" />
            </Button>
          </>
        </OverlayTrigger>
      </div>
    </>
  );
};
export const removeButton = (props, doc) => {
  return (
    <>
      <div className="button-remove-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Discard document"
                key="button-remove-tootip"
              />
            </Tooltip>
          )}
        >
          <Button
            variant="outline-danger"
            size="sm"
            data-testid={"rm-button-" + doc.name}
            onClick={props.handleRemove(doc.name)}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </OverlayTrigger>
      </div>
    </>
  );
}

export const downloadSignedButton = (props, doc) => {
  return (
    <>
      <div className="button-download-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Download signed document. Be sure to save the original rather than a copy."
                key="button-download-tootip"
              />
            </Tooltip>
          )}
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
        </OverlayTrigger>
      </div>
    </>
  );
};
export const retryButton = (props, doc) => {
  return (
    <>
      <div className="button-retry-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Try again to prepare the document for signing"
                key="retry-button-tootip"
              />
            </Tooltip>
          )}
        >
          <Button
            variant="outline-success"
            data-testid={"button-retry-" + doc.name}
            size="sm"
            onClick={props.handleRetry(doc, props)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </OverlayTrigger>
      </div>
    </>
  );
}
export const multiSignButton = (props, doc) => {
  if (
    !["Yes", "yes", "True", "true", "T", "t"].includes(
      props.multisign_buttons
    )
  ) {
    return "";
  }
  return (
    <>
      <div className="button-multisign-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Invite other users to sign the document. After all invitees sign, you'll be asked to add a final signature."
                key="button-multisign-tootip"
              />
            </Tooltip>
          )}
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
        </OverlayTrigger>
      </div>
    </>
  );
}
export const showMessage = (doc) => {
  return (
    <>
      <div className="message-flex-item">
        <span alt={doc.message}>{doc.message}</span>
      </div>
    </>
  );
}

export const declineSignatureButton = (props, doc) => {
  return (
    <>
      <div className="button-decline-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          overlay={(
            <Tooltip placement="auto">
              <FormattedMessage
                defaultMessage="Click here to decline your invitation to sign this document."
                key="invited-decline-button-help"
              />
            </Tooltip>
          )}
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.handleDeclineSigning({doc: doc, intl: props.intl})}
          >
            <FormattedMessage
              defaultMessage="Decline Signature"
              key="decline-sign-button"
            />
          </Button>
        </OverlayTrigger>
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
}
