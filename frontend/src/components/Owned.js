import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ConfirmDialogContainer from "containers/ConfirmDialog";

import ReInviteFormContainer from "containers/ReInviteForm";
import DocPreviewContainer from "containers/DocPreview";
import { docToFile } from "components/utils";
import LittleSpinner from "components/LittleSpinner";

import "styles/Invitation.scss";

const signButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-sign-container">
          <div className="button-sign-invitation">
            <Button
              variant="outline-success"
              size="sm"
              onClick={props.handleSign(doc, props)}
            >
              <FormattedMessage
                defaultMessage="Add Final Signature"
                key="final-sign-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

const namedSpinner = (index, name) => {
  return (
    <>
      <LittleSpinner index={index} />
      <div className="spinning-flex-item">{` ${name} ...`}</div>
    </>
  );
}

const skipSignatureButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
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
                defaultMessage="Skip Final Signature"
                key="skip-sign-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

const resendButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
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

const previewButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
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


const removeButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={
          <Tooltip placement="auto">{help}</Tooltip>
        }
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

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Owned extends Component {
  getHelp(msg) {
    const msgs = {
      "close-button-help": this.props.intl.formatMessage({
        defaultMessage: "Cancel Request",
        id: "owned-close-button-help",
      }),
      "sign-button-help": this.props.intl.formatMessage({
        defaultMessage:
          "All requested users have alredy signed the document, click here to add your final signature",
        id: "owned-sign-button-help",
      }),
      "skip-button-help": this.props.intl.formatMessage({
        defaultMessage:
          "All requested users have alredy signed the document, click here to skip adding your final signature",
        id: "owned-skip-button-help",
      }),
      "resend-button-help": this.props.intl.formatMessage({
        defaultMessage:
          "Click here to re-send an invitation email to all pending users",
        id: "owned-resend-button-help",
      }),
      "preview-button-help": this.props.intl.formatMessage({
        defaultMessage:
          "Click here to preview the document",
        id: "owned-preview-button-help",
      }),
    };
    return msgs[msg];
  }
  render() {
    if (this.props.owned.length === 0) return "";
    return (
      <>
        {this.props.owned.map((doc, index) => {
          let docFile = null;
          if (doc.show) {
            docFile = docToFile(doc);
          }
          return (
            <div className="invitation-multisign" key={index}>
              <div className="invitation-multisign-request">
                <div className={"invitation-name-and-buttons-" + this.props.size}>
                  <div className="name-flex-item">
                    <span className="invitation-doc-name-label">
                      <FormattedMessage
                        defaultMessage="You have invited signers to sign"
                        key="owned-doc-name"
                      />
                    </span>
                    <span className="invitation-doc-name">{doc.name}</span>
                  </div>
                  <div className="invitation-buttons">
                    {(doc.state === 'signing') && (
                      <>
                        {namedSpinner(index, 'signing')}
                      </>
                    ) || (
                      <>
                        {previewButton(this.props, doc, this.getHelp("preview-button-help"))}
                        {removeButton(this.props, doc, this.getHelp("close-button-help"))}
                        {doc.pending.length === 0 &&
                          signButton(this.props, doc, this.getHelp("sign-button-help"))}
                        {doc.pending.length === 0 &&
                          skipSignatureButton(this.props, doc, this.getHelp("skip-button-help"))}
                        {doc.pending.length > 0 &&
                          resendButton(
                            this.props,
                            doc,
                            this.getHelp("resend-button-help")
                          )}
                        {doc.show && (
                          <DocPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={doc.key}
                            handleClose={this.props.handleClosePreview}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
                {doc.pending.length > 0 && (
                  <>
                    <div className="pending-invites">
                      <span className="pending-invites-label">
                        <FormattedMessage
                          defaultMessage="Waiting for signatures by:"
                          key="multisign-owned-waiting"
                        />
                      </span>
                      <span className="pending-invites-items">
                        {doc.pending.map((invite, index) => {
                          return (
                            <span className="pending-invite-item" key={index}>
                              {invite.name} &lt;{invite.email}&gt;
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  </>
                )}
                {doc.signed.length > 0 && (
                  <>
                    <div className="signed-invites">
                      <span className="signed-invites-label">
                        <FormattedMessage
                          defaultMessage="Already signed by:"
                          key="multisign-owned-signed"
                        />
                      </span>
                      <span className="signed-invites-items">
                        {doc.signed.map((invite, index) => {
                          return (
                            <span className="signed-invite-item" key={index}>
                              {invite.name} &lt;{invite.email}&gt;
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  }
}

Owned.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Owned);
