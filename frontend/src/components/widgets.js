import React from "react";
import { FormattedMessage } from "react-intl";
import { ESTooltip } from "containers/Overlay";
import BForm from "react-bootstrap/Form";
import { Field } from "formik";

import Button from "containers/Button";
import { humanFileSize, getCreationDate } from "components/utils";
import LittleSpinner from "components/LittleSpinner";
import ConfirmDialogContainer from "containers/ConfirmDialog";

export const docName = (doc) => {
  return <div className="name-flex-item">{doc.name}</div>;
};
export const docSize = (doc) => {
  return <div className="size-flex-item">{humanFileSize(doc.size)}</div>;
};
export const docCreated = (props) => {
  const creationDate = getCreationDate(props.doc);
  if (creationDate !== null) {
    return (
      <div className={"doc-container-info-row-" + props.size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Created:"
            key="creation-date-label"
          />
        </span>
        <span className="info-row-items">
          <span className="info-row-item">{creationDate.toLocaleString()}</span>
        </span>
      </div>
    );
  } else return "";
};

export const infoLine = (doc, size) => {
  const creationDate = getCreationDate(doc);
  let created = "";
  if (creationDate !== null) {
    created = (
      <div className={"info-line info-line-1 doc-container-info-row-" + size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Created:"
            key="creation-date-label"
          />
        </span>
        <span className="info-row-items">
          <span className="info-row-item">{creationDate.toLocaleString()}</span>
        </span>
      </div>
    );
  }
  let requiredLoa = "";
  if (doc.loa !== undefined) {
    const loa = doc.loa.split(",");
    const loaName = loa[1];
    const loaValue = loa[0];
    requiredLoa = (
      <div className={"info-line info-line-2 doc-container-info-row-" + size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Required security level:"
            key="multisign-loa"
          />
        </span>
        &nbsp;
        <ESTooltip tooltip={loaValue} helpId={"invited-" + loaValue}>
          <span className="info-row-item">{loaName}</span>
        </ESTooltip>
      </div>
    );
  }

  let ordered = "";
  if (doc.ordered) {
    ordered = (
      <div className={"info-line info-line-3 doc-container-info-row-" + size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Workflow invitation"
            key="multisign-owned-ordered"
          />
        </span>
      </div>
    );
  }
  return (
    <div className="doc-info-line">
      {created}
      {requiredLoa}
      {ordered}
    </div>
  );
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
              defaultMessage="Preview and approve"
              key="forced-preview-button"
            />
          </Button>
        </ESTooltip>
      </div>
    </>
  );
};

export const multiSignButton = (props, doc) => {
  return (
    <>
      <div className="button-multisign-flex-item">
        <ESTooltip
          helpId={"button-multisign-" + doc.name}
          tooltip={
            <FormattedMessage
              defaultMessage="Click here to invite others to sign"
              key="multisign-button-tootip"
            />
          }
        >
          <Button
            variant="outline-dark"
            id={"button-multisign-" + doc.name}
            size="sm"
            disabling={true}
            onClick={props.openInviteForm(doc)}
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

export const removeConfirmButton = (props, doc, id) => {
  if (id === undefined) {
    id = "confirm-remove-" + doc.name;
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
  const id = "confirm-remove-" + doc.name;
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
            id={"button-rm-template-" + doc.name}
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
          helpId={"button-download-signed-" + doc.name}
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
            id={"button-download-signed-" + doc.name}
            disabling={true}
            onClick={props.handleDlSigned({
              docName: doc.name,
              intl: props.intl,
            })}
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

export const downloadDraftButton = (props, doc) => {
  return (
    <>
      <div className="button-download-flex-item">
        <ESTooltip
          helpId={"button-download-draft-" + doc.key}
          tooltip={
            <FormattedMessage
              defaultMessage="Download partially signed document. Be sure to save the original rather than a copy."
              key="button-download-partial-tootip"
            />
          }
        >
          <Button
            variant="outline-success"
            size="sm"
            id={"button-download-draft-" + doc.key}
            disabling={true}
            onClick={props.handleDlDraft({
              docKey: doc.key,
              intl: props.intl,
            })}
          >
            <FormattedMessage
              defaultMessage="Download (draft)"
              key="dldraft-button"
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
          helpId={"button-retry-" + doc.name}
          tooltip={
            <FormattedMessage
              defaultMessage="Try again to prepare the document for signing"
              key="retry-button-tootip"
            />
          }
        >
          <Button
            variant="outline-success"
            id={"button-retry-" + doc.name}
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

export const showMessage = (doc) => {
  return (
    <>
      <div className="message-flex-item">
        <span alt={doc.message} dangerouslySetInnerHTML={{__html: doc.message}} />
      </div>
    </>
  );
};

export const skipSignatureButton = (props, doc) => {
  return (
    <>
      <div className="button-skip-flex-item">
        <ESTooltip
          helpId={"button-skipping-" + doc.name}
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
            id={"button-skipping-" + doc.name}
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
          helpId={"button-delegate-" + doc.name}
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
            id={"button-delegate-" + doc.name}
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
            defaultMessage="Select documents above and click here to send them for signing. You will be redirected to login again to authenticate yourself when signing."
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
              defaultMessage="Sign selected documents"
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
              defaultMessage="Download all signed"
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
  intl,
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
              defaultMessage="Clear personal documents list"
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

export const skipFinalControl = (
  <div className="skipfinal-choice-holder">
    <BForm.Group className="skipfinal-choice-group form-group">
      <ESTooltip
        helpId="skipfinal-choice-input"
        inModal={true}
        tooltip={
          <FormattedMessage
            defaultMessage="Finalize the signature flow automatically after the last person invited responds to the invitation."
            key="skipfinal-choice-help"
          />
        }
      >
        <BForm.Label
          className="skipfinal-choice-label"
          htmlFor="skipfinal-choice-input"
        >
          <FormattedMessage
            defaultMessage="Finalise signature flow automatically"
            key="skipfinal-choice-field"
          />
        </BForm.Label>
      </ESTooltip>
      <Field
        name="skipfinalChoice"
        id="skipfinal-choice-input"
        data-testid="skipfinal-choice-input"
        className="skipfinal-choice"
        type="checkbox"
      />
    </BForm.Group>
  </div>
);

export const sendsignedControl = (
  <div className="sendsigned-choice-holder">
    <BForm.Group className="sendsigned-choice-group form-group">
      <ESTooltip
        helpId="sendsigned-choice-input"
        inModal={true}
        tooltip={
          <FormattedMessage
            defaultMessage="Send final signed document via email to all who signed it."
            key="sendsigned-choice-help"
          />
        }
      >
        <BForm.Label
          className="sendsigned-choice-label"
          htmlFor="sendsigned-choice-input"
        >
          <FormattedMessage
            defaultMessage="Send signed document in email"
            key="sendsigned-choice-field"
          />
        </BForm.Label>
      </ESTooltip>
      <Field
        name="sendsignedChoice"
        id="sendsigned-choice-input"
        data-testid="sendsigned-choice-input"
        className="sendsigned-choice"
        type="checkbox"
      />
    </BForm.Group>
  </div>
);
