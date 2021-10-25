import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "containers/Overlay";
import Tooltip from "react-bootstrap/Tooltip";

import OwnedContainer from "containers/Owned";
import InvitedContainer from "containers/Invited";
import { preparePDF } from "components/utils";
import ConfirmDialogContainer from "containers/ConfirmDialog";
import DocumentLocal from "components/DocumentLocal";
import DocumentOwned from "components/DocumentOwned";

import "styles/DocManager.scss";

/**
 * @desc This component provides a representation of the documents in the session.
 *
 * Each document can be in one of several states:
 * - "loading": The document is being loaded from the filesystem.
 * - "failed-loading": PDFjs has not been able to parse the document, irrecoverable failure.
 * - "failed-preparing": There's been som problem sending the document to the backend and API to be prepared, recoverable.
 * - "loaded": The document has been loaded from the fs and is ready to be signed.
 * - "signing": The document is in the process of being signed.
 * - "failed-signing": There's been some problem in the signing process, recoverable failure.
 * - "signed": The document has been signed and is ready to be got by the user.
 *
 * Depending on the state, it will show a different set of controls.
 * @component
 */
class DocManager extends React.Component {

  render() {
    let someSelected = false;
    let showSignButton = false;
    [this.props.pending, this.props.owned].forEach((docs) => {
      docs.forEach((doc) => {
        if (doc.state === "selected") {
          someSelected = true;
          showSignButton = true;
        }
      });
    });
    let showDlAllButton = false;
    let showClearButton = false;

    return (
      <>
        {(this.props.unauthn && this.props.invitedUnauthn) && (
          <>
            <div className="invited-unauthn-title">
              <FormattedMessage
                defaultMessage="You have been invited to sign the following document(s)"
                key="invited-unauthn-title"
              />
            </div>
          </>
        )}
        {(this.props.unauthn && !this.props.invitedUnauthn) && (
          <>
            <div className="invited-unauthn-title">
              <FormattedMessage
                defaultMessage="Unauthorized"
                key="unauthn-title"
              />
            </div>
            <div className="invited-unauthn-text">
              <FormattedMessage
                defaultMessage="The organization/identity provider you are affiliated with does not have permission to use this service. Please contact your IT-department to obtain the necessary permissions."
                key="unauthn-text"
              />
            </div>
          </>
        )}
        {(!this.props.unauthn) && (
          <>
            {this.props.documents.length > 0 && (
              <fieldset className="local-monosign-container">
                <legend>
                  <FormattedMessage
                    defaultMessage="Local documents"
                    key="local-monosign-legend"
                  />
                </legend>
                {this.props.documents.map((doc, index) => {
                  showClearButton = true;
                  if (
                    ["loaded", "selected", "failed-signing"].includes(doc.state)
                  ) {
                    showSignButton = true;
                  }
                  if (doc.state === "signed") {
                    showDlAllButton = true;
                  }
                  const docFile = preparePDF(doc);
                  if (docFile === null) {
                    doc = {
                      ...doc,
                      state: "failed-loading",
                      message: this.props.intl.formatMessage({
                        defaultMessage: "Malformed PDF",
                        id: "malformed-pdf",
                      }),
                    };
                  }
                  if (doc.state === "selected") someSelected = true;

                  if (doc.hasOwnProperty('pending')) {
                    return (<DocumentOwned key={index} doc={doc} {...this.props} />);
                  } else {
                    return (<DocumentLocal key={index} doc={doc} docFile={docFile} {...this.props} />);
                  }
                })}
              </fieldset>
            )}
          </>
        )}
        <div className={"multisign-container-" + this.props.size}>
          {(!this.props.unauthn) && (
            <>
              {this.props.owned.length > 0 && (
                <fieldset className="owned-multisign-container">
                  <legend>
                    <FormattedMessage
                      defaultMessage="Documents you have invited others to sign"
                      key="owned-multisign-legend"
                    />
                  </legend>
                  <OwnedContainer />
                </fieldset>
              )}
            </>
          )}
          {this.props.pending.length > 0 && (
            <fieldset className="invited-multisign-container">
              <legend>
                <FormattedMessage
                  defaultMessage="Documents you are invited to sign"
                  key="invited-multisign-legend"
                />
              </legend>
              <InvitedContainer />
            </fieldset>
          )}
        </div>
        <div id="adjust-vertical-space" />
        <div id="global-buttons-wrapper">
          {(showSignButton && (
            <div className="button-sign-flex-item">
              <OverlayTrigger
                delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
                trigger={["hover", "focus"]}
                rootClose={true}
                overlay={(
                  <Tooltip placement="auto">
                    <FormattedMessage
                      defaultMessage="Select documents above and click here to send them for signing."
                      key="button-sign-tootip"
                    />
                  </Tooltip>
                )}
              >
                <div id="button-sign-wrapper">
                  <Button
                    variant="success"
                    id="button-sign"
                    size="lg"
                    disabled={!someSelected}
                    style={someSelected ? {} : { pointerEvents: "none" }}
                    onClick={this.props.handleSubmitToSign.bind(this)}
                  >
                    <FormattedMessage
                      defaultMessage="Sign Selected Documents"
                      key="sign-selected-button"
                    />
                  </Button>
                </div>
              </OverlayTrigger>
            </div>
          )) || (
            <div className={"dummy-button-sign-flex-item-" + this.props.size} />
          )}
          {(showDlAllButton && (
            <div className="button-dlall-flex-item">
              <OverlayTrigger
                delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
                trigger={["hover", "focus"]}
                rootClose={true}
                overlay={(
                  <Tooltip placement="auto">
                    <FormattedMessage
                      defaultMessage="Download all signed documents."
                      key="button-dlall-tootip"
                    />
                  </Tooltip>
                )}
              >
                <div id="button-dlall-wrapper">
                  <Button
                    variant="success"
                    id="button-dlall"
                    data-testid="button-dlall"
                    size="lg"
                    onClick={this.props.handleDownloadAll.bind(this)}
                  >
                    <FormattedMessage
                      defaultMessage="Download All Signed"
                      key="dlall-selected-button"
                    />
                  </Button>
                </div>
              </OverlayTrigger>
            </div>
          )) || (
            <div
              className={"dummy-button-dlall-flex-item-" + this.props.size}
            />
          )}
          {(showClearButton && (
            <div className="button-clear-flex-item">
              <OverlayTrigger
                delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
                trigger={["hover", "focus"]}
                rootClose={true}
                overlay={(
                  <Tooltip placement="auto">
                    <FormattedMessage
                      defaultMessage="Discard all documents loaded above"
                      key="clear-docs-tootip"
                    />
                  </Tooltip>
                )}
              >
                <div id="button-clear-wrapper">
                  <Button
                    variant="primary"
                    id="clear-session-button"
                    size="lg"
                    onClick={this.props.showConfirm("confirm-clear-session")}
                  >
                    <FormattedMessage
                      defaultMessage="Clear Local List"
                      key="clear-session-button"
                    />
                  </Button>
                </div>
              </OverlayTrigger>
              <ConfirmDialogContainer
                confirmId="confirm-clear-session"
                title={this.props.intl.formatMessage({
                  defaultMessage: "Confirm Clear List",
                  id: "header-confirm-clear-title",
                })}
                mainText={this.props.intl.formatMessage({
                  defaultMessage:
                    'Clicking "Confirm" will remove all documents from your list',
                  id: "header-confirm-clear-text",
                })}
                confirm={this.props.clearDb}
              />
            </div>
          )) || (
            <div
              className={"dummy-button-clear-flex-item-" + this.props.size}
            />
          )}
        </div>
        {this.props.destinationUrl !== undefined &&
          this.props.destinationUrl !== "https://dummy.destination.url" && (
            <div>
              <form
                id="signing-form"
                data-testid="signing-form"
                action={this.props.destinationUrl}
                method="post"
              >
                <input
                  type="hidden"
                  name="Binding"
                  value={this.props.binding}
                />
                <input
                  type="hidden"
                  name="RelayState"
                  value={this.props.relayState}
                />
                <input
                  type="hidden"
                  name="EidSignRequest"
                  value={this.props.signRequest}
                />
              </form>
            </div>
          )}
        {this.props.destinationUrl === "https://dummy.destination.url" && (
          <div>
            <form
              id="signing-form"
              data-testid="signing-form"
              onSubmit={(e) => {
                e.preventDefault();
                return false;
              }}
            />
          </div>
        )}
      </>
    );
  }
}

DocManager.propTypes = {
  /**
   * The documents to manage
   */
  documents: PropTypes.array,
  handlePreview: PropTypes.func,
  handleRemove: PropTypes.func,
  handleDlSigned: PropTypes.func,
  handleSubmitToSign: PropTypes.func,
};

export default injectIntl(DocManager);
