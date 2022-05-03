import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";
import { ESTooltip } from "containers/Overlay";

import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";

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
class DocumentLocal extends React.Component {
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
          'Click on the button labeled "Preview and approve for signature" to review the document and confirm that you approve it for signature',
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
    const doc = this.props.doc;
    const signed =
      (doc.state === "signed" && (
        <div className="doc-container-signed-row" key="-1">
          <span className="signed-invites-label">
            <FormattedMessage
              defaultMessage="Signed by:"
              key="multisign-owned-signed"
            />
          </span>
          <span className="signed-invites-items">
            <span className="signed-invite-item">
              {this.props.name} &lt;{this.props.mail}&gt;
            </span>
          </span>
        </div>
      )) ||
      "";

    return (
      <>
        <ESPopover
          helpId={"local-doc-container-" + doc.name}
          key={doc.name}
          title={this.getHelp(doc.state + "-title")}
          body={this.getHelp(doc.state)}
        >
          {(this.props.size === "lg" && (
            <div className={"doc-flex-container-local " + doc.state} key="0">
              <div className="doc-flex-container">
                {doc.state === "loading" && (
                  <>
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                    <div className="doc-manager-buttons">
                      {widgets.namedSpinner(doc.name, "loading")}
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
                {(doc.state === "loaded" || doc.state === "selected") && (
                  <>
                    {widgets.selectDoc(this.props, doc)}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                    <div className="doc-manager-buttons">
                      {widgets.createTemplateButton(this.props, doc)}
                      {widgets.multiSignButton(this.props, doc)}
                      {widgets.previewButton(this.props, doc)}
                      {widgets.removeButton(this.props, doc)}
                    </div>
                  </>
                )}
                {doc.state === "signing" && (
                  <>
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                    <div className="doc-manager-buttons">
                      {widgets.namedSpinner(doc.name, "signing")}
                    </div>
                  </>
                )}
                {doc.state === "signed" && (
                  <>
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                    <div className="doc-manager-buttons">
                      {widgets.multiSignButton(this.props, doc)}
                      {widgets.downloadSignedButton(this.props, doc)}
                      {widgets.removeButton(this.props, doc)}
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
              {signed}
              {preparePrevSigs(doc)}
            </div>
          )) || (
            <div className={"doc-flex-container-sm " + doc.state} key="0">
              {doc.state === "loading" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-msg-row">
                    {widgets.namedSpinner(doc.name, "loading")}
                  </div>
                </>
              )}
              {doc.state === "failed-loading" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-msg-row">
                    {widgets.showMessage(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {doc.state === "failed-preparing" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-msg-row">
                    {widgets.showMessage(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.retryButton(this.props, doc)}
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {doc.state === "unconfirmed" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.forcedPreviewButton(this.props, doc)}
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {(doc.state === "loaded" || doc.state === "selected") && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.selectDoc(this.props, doc)}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.multiSignButton(this.props, doc)}
                    {widgets.previewButton(this.props, doc)}
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {doc.state === "signing" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-msg-row">
                    {widgets.namedSpinner(doc.name, "signing")}
                  </div>
                </>
              )}
              {doc.state === "signed" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.downloadSignedButton(this.props, doc)}
                    {widgets.multiSignButton(this.props, doc)}
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {doc.state === "failed-signing" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.selectDoc(this.props, doc)}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-msg-row">
                    {widgets.showMessage(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.previewButton(this.props, doc)}
                    {widgets.removeButton(this.props, doc)}
                  </div>
                </>
              )}
              {signed}
              {preparePrevSigs(doc)}
            </div>
          )}
        </ESPopover>
      </>
    );
  }
}

DocumentLocal.propTypes = {
  /**
   * The documents to manage
   */
  documents: PropTypes.array,
  handlePreview: PropTypes.func,
  handleRemove: PropTypes.func,
  handleDlSigned: PropTypes.func,
  handleSubmitToSign: PropTypes.func,
};

export default injectIntl(DocumentLocal);
