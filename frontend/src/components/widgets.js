import React from "react";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "containers/Overlay";
import Tooltip from "react-bootstrap/Tooltip";
import ConfirmDialogContainer from "containers/ConfirmDialog";

import ReInviteFormContainer from "containers/ReInviteForm";
import { humanFileSize } from "components/utils";
import LittleSpinner from "components/LittleSpinner";


export const selectDoc = (index, doc, props) => {
  return (
    <>
      <div className="doc-selector-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(props) => (
            <Tooltip id="tooltip-select-owned-doc" {...props}>
              <FormattedMessage
                defaultMessage="Select the document for signing"
                key="select-doc-tootip"
              />
            </Tooltip>
          )}
        >
          <input
            type="checkbox"
            id={"owned-doc-selector-" + index}
            name={"owned-doc-selector-" + index}
            data-testid={"owned-doc-selector-" + index}
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

export const skipSignatureButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-skip-container">
          <div className="button-skip-invitation">
            <Button
              variant="outline-success"
              size="sm"
              onClick={props.handleSkipSigning(doc, props)}
            >
              <FormattedMessage
                defaultMessage="Skip Signature"
                key="skip-sign-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

export const resendButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-resend-container">
          <div className="button-resend-invitation">
            <Button
              variant="outline-success"
              size="sm"
              data-testid={"button-open-resend-" + doc.name}
              onClick={props.handleResend(doc)}
            >
              <FormattedMessage
                defaultMessage="Resend invitations"
                key="resend-invitations-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
      <ReInviteFormContainer doc={doc} />
    </>
  );
};

export const previewButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-preview-container">
          <div className="button-preview-invitation">
            <Button
              variant="outline-dark"
              size="sm"
              onClick={props.showPreview(doc.key)}
            >
              <FormattedMessage defaultMessage="Preview" key="preview-button" />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

export const removeButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-remove-container">
          <div className="button-remove-invitation">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={props.showConfirm("confirm-remove-owned-" + doc.name)}
              data-testid={"rm-invitation-" + doc.name}
            >
              <FormattedMessage defaultMessage="Remove" key="remove-button" />
            </Button>
            <ConfirmDialogContainer
              confirmId={"confirm-remove-owned-" + doc.name}
              title={props.intl.formatMessage({
                defaultMessage: "Confirm Removal of invitation",
                id: "header-confirm-remove-owned-title",
              })}
              mainText={props.intl.formatMessage({
                defaultMessage:
                  'Clicking "Confirm" will remove all invitations to sign the document',
                id: "header-confirm-remove-owned-text",
              })}
              confirm={props.handleRemove(doc, props)}
            />
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

export const downloadButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-download-container">
          <div className="button-download-invitation">
            <Button
              variant="outline-success"
              size="sm"
              onClick={props.downloadSigned(doc.name)}
            >
              <FormattedMessage
                defaultMessage="Download (signed)"
                key="dlsigned-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};
