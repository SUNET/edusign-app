import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "containers/Overlay";
import Tooltip from "react-bootstrap/Tooltip";
import Popover from "react-bootstrap/Popover";
import PopoverContent from "react-bootstrap/PopoverContent";
import PopoverTitle from "react-bootstrap/PopoverTitle";
import LittleSpinner from "components/LittleSpinner";

import DocPreviewContainer from "containers/DocPreview";
import ForcedPreviewContainer from "containers/ForcedPreview";
import InviteFormContainer from "containers/InviteForm";
import OwnedContainer from "containers/Owned";
import InvitedContainer from "containers/Invited";
import { humanFileSize, preparePDF } from "components/utils";
import ConfirmDialogContainer from "containers/ConfirmDialog";
import * as widgets from "components/widgets";

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

  getHelp(msg) {
    const msgs = {
      "loading-title": this.props.intl.formatMessage({
        defaultMessage: "Loading document",
        id: "docmanager-help-loading-title",
      }),
      loading: this.props.intl.formatMessage({
        defaultMessage: "Please wait while the document loads",
        id: "docmanager-help-loading",
      }),
      "loaded-title": this.props.intl.formatMessage({
        defaultMessage: "Document loaded",
        id: "docmanager-help-loaded-title",
      }),
      loaded: this.props.intl.formatMessage({
        defaultMessage:
          'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign Selected Documents"',
        id: "docmanager-help-loaded",
      }),
      "failed-loading-title": this.props.intl.formatMessage({
        defaultMessage: "Failed loading document",
        id: "docmanager-help-failed-loading-title",
      }),
      "failed-loading": this.props.intl.formatMessage({
        defaultMessage: "This does not seem to be a valid document",
        id: "docmanager-help-failed-loading",
      }),
      "unconfirmed-title": this.props.intl.formatMessage({
        defaultMessage: "This document has not yet been approved",
        id: "docmanager-help-unconfirmed-title",
      }),
      unconfirmed: this.props.intl.formatMessage({
        defaultMessage:
          'Click on the button labeled "Approve document for signature" to review the document and confirm that you approve it for signature',
        id: "docmanager-help-unconfirmed",
      }),
      "selected-title": this.props.intl.formatMessage({
        defaultMessage: "Document selected for signing",
        id: "docmanager-help-selected-title",
      }),
      selected: this.props.intl.formatMessage({
        defaultMessage:
          'Click on the button below labelled "Sign Selected Documents" to sign this document',
        id: "docmanager-help-selected",
      }),
      "failed-preparing-title": this.props.intl.formatMessage({
        defaultMessage: "Failed preparing document",
        id: "docmanager-help-failed-preparing-title",
      }),
      "failed-preparing": this.props.intl.formatMessage({
        defaultMessage:
          'There was a problem preparing the document for signing, clik on the button labelled "retry" to try again',
        id: "docmanager-help-failed-preparing",
      }),
      "signing-title": this.props.intl.formatMessage({
        defaultMessage: "Signing document",
        id: "docmanager-help-signing-title",
      }),
      signing: this.props.intl.formatMessage({
        defaultMessage: "Please wait while the document is signed",
        id: "docmanager-help-signing",
      }),
      "failed-signing-title": this.props.intl.formatMessage({
        defaultMessage: "Failed signing document",
        id: "docmanager-help-failed-signing-title",
      }),
      "failed-signing": this.props.intl.formatMessage({
        defaultMessage:
          'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign Selected Documents"',
        id: "docmanager-help-failed-signing",
      }),
      "signed-title": this.props.intl.formatMessage({
        defaultMessage: "Document signed",
        id: "docmanager-help-signed-title",
      }),
      signed: this.props.intl.formatMessage({
        defaultMessage:
          'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
        id: "docmanager-help-signed",
      }),
    };
    return msgs[msg];
  }

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

                  if (this.props.size === "lg") {
                    return (
                      <React.Fragment key={index}>
                        {["loaded", "selected"].includes(doc.state) && (
                          <InviteFormContainer docId={doc.id} docName={doc.name} />
                        )}
                        {["loaded", "selected", "failed-signing"].includes(
                          doc.state
                        ) && (
                          <DocPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={index}
                            handleClose={this.props.handleClosePreview}
                          />
                        )}
                        {doc.state === "unconfirmed" && (
                          <ForcedPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={index}
                            handleClose={this.props.handleCloseForcedPreview}
                            handleConfirm={this.props.handleConfirmForcedPreview}
                            handleUnConfirm={
                              this.props.handleUnConfirmForcedPreview
                            }
                          />
                        )}
                        <OverlayTrigger
                          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
                          trigger={["hover", "focus"]}
                          rootClose={true}
                          overlay={
                            <Popover placement="auto">
                              <PopoverTitle>
                                {this.getHelp(doc.state + "-title")}
                              </PopoverTitle>
                              <PopoverContent>
                                {this.getHelp(doc.state)}
                              </PopoverContent>
                            </Popover>
                          }
                        >
                          <div className={"doc-flex-container " + doc.state}>
                            {doc.state === "loading" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.namedSpinner(index, "loading")}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-loading" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docName(doc)}
                                {widgets.showMessage(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-preparing" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                {widgets.showMessage(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.retryButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "unconfirmed" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.forcedPreviewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {(doc.state === "loaded" ||
                              doc.state === "selected") && (
                              <>
                                {widgets.selectDoc(this.props, doc)}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.previewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                  {widgets.multiSignButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "signing" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.namedSpinner(index, "signing")}
                                </div>
                              </>
                            )}
                            {doc.state === "signed" && (
                              <>
                                {widgets.dummySelectDoc()}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.downloadSignedButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-signing" && (
                              <>
                                {widgets.selectDoc(this.props, doc)}
                                {widgets.docSize(doc)}
                                {widgets.docName(doc)}
                                {widgets.showMessage(doc)}
                                <div className="doc-manager-buttons">
                                  {widgets.previewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                          </div>
                        </OverlayTrigger>
                      </React.Fragment>
                    );
                  } else if (this.props.size === "sm") {
                    return (
                      <React.Fragment key={index}>
                        {["loaded", "selected"].includes(doc.state) && (
                          <InviteFormContainer docId={doc.id} docName={doc.name} />
                        )}
                        {["loaded", "selected", "failed-signing"].includes(
                          doc.state
                        ) && (
                          <DocPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={index}
                            handleClose={this.props.handleClosePreview}
                          />
                        )}
                        {doc.state === "unconfirmed" && (
                          <ForcedPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={index}
                            handleClose={this.props.handleCloseForcedPreview}
                            handleConfirm={this.props.handleConfirmForcedPreview}
                            handleUnConfirm={
                              this.props.handleUnConfirmForcedPreview
                            }
                          />
                        )}
                        <OverlayTrigger
                          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
                          trigger={["hover", "focus"]}
                          rootClose={true}
                          key={index}
                          overlay={
                            <Tooltip placement="auto">
                              {this.getHelp(doc.state)}
                            </Tooltip>
                          }
                        >
                          <div className={"doc-flex-container-sm " + doc.state}>
                            {doc.state === "loading" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.namedSpinner(index, "loading")}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-loading" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.showMessage(doc)}
                                </div>
                                <div className="doc-container-third-row">
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-preparing" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.showMessage(doc)}
                                </div>
                                <div className="doc-container-third-row">
                                  {widgets.retryButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "unconfirmed" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.forcedPreviewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {(doc.state === "loaded" ||
                              doc.state === "selected") && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.selectDoc(this.props, doc)}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.previewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                  {widgets.multiSignButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "signing" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.namedSpinner(index, "signing")}
                                </div>
                              </>
                            )}
                            {doc.state === "signed" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.dummySelectDoc()}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.downloadSignedButton(this.props, doc)}
                                </div>
                              </>
                            )}
                            {doc.state === "failed-signing" && (
                              <>
                                <div className="doc-container-first-row">
                                  {widgets.selectDoc(this.props, doc)}
                                  {widgets.docSize(doc)}
                                  {widgets.docName(doc)}
                                </div>
                                <div className="doc-container-second-row">
                                  {widgets.showMessage(doc)}
                                </div>
                                <div className="doc-container-third-row">
                                  {widgets.previewButton(this.props, doc)}
                                  {widgets.removeButton(this.props, doc)}
                                </div>
                              </>
                            )}
                          </div>
                        </OverlayTrigger>
                      </React.Fragment>
                    );
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
