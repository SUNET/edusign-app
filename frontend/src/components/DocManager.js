import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";

import ForcedPreviewContainer from "containers/ForcedPreview";
import ForcedXMLPreviewContainer from "containers/ForcedXMLPreview";
import DocPreviewContainer from "containers/DocPreview";
import XMLPreviewContainer from "containers/XMLPreview";
import InviteFormContainer from "containers/InviteForm";
import OwnedContainer from "containers/Owned";
import InvitedContainer from "containers/Invited";
import ConfirmDialogContainer from "containers/ConfirmDialog";
import DocumentLocal from "components/DocumentLocal";
import DocumentTemplate from "components/DocumentTemplate";
import DocumentOwned from "components/DocumentOwned";
import * as widgets from "components/widgets";
import PDFFormContainer from "containers/PDFForm";
import { docToFile } from "components/utils";

import "styles/DocManager.scss";
import "styles/Invitation.scss";

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
  shouldComponentUpdate(nextProps) {
    return !nextProps.inviting;
  }

  componentDidUpdate() {
    const form = document.getElementById("signing-form");
    if (form) {
      if (form.requestSubmit) {
        form.requestSubmit();
      } else {
        // Safari does not implement the requestSubmit API
        form.submit();
      }
    }
  }

  render() {
    let disableSigning = true;
    let disableDlAllButton = true;
    [this.props.pending, this.props.owned].forEach((docs) => {
      docs.forEach((doc) => {
        if (doc.state === "selected") {
          disableSigning = false;
        } else if (doc.state === "signed") {
          disableDlAllButton = false;
        }
      });
    });
    let disableClearButton = true;

    return (
      <>
        {this.props.unauthn && this.props.invitedUnauthn && (
          <>
            <div className="invited-unauthn-title">
              <FormattedMessage
                defaultMessage="You have been invited to sign the following document(s)"
                key="invited-unauthn-title"
              />
            </div>
          </>
        )}
        {this.props.unauthn && !this.props.invitedUnauthn && (
          <>
            <div className="invited-unauthn-title">
              <FormattedMessage
                defaultMessage="No documents to sign"
                key="unauthn-title"
              />
            </div>
            <div className="invited-unauthn-text">
              <FormattedMessage
                defaultMessage="You are currently not invited to sign any documents. The organization/identity provider you are affiliated with does not have permission to upload your own documents into eduSign to sign. Please contact your IT-department if you would like to be able to sign your own documents or invite others to sign your documents."
                key="unauthn-text"
              />
            </div>
          </>
        )}
        {!this.props.unauthn && (
          <>
            {this.props.templates.length > 0 && (
              <fieldset className="local-template-container">
                <legend data-testid="legend-templates">
                  <FormattedMessage
                    defaultMessage="Templates"
                    key="local-templates-legend"
                  />
                </legend>
                {this.props.templates.map((doc, index) => {
                  return (
                    <React.Fragment key={index}>
                      <DocumentTemplate key={index} doc={doc} {...this.props} />
                      <ConfirmDialogContainer
                        confirmId={"confirm-remove-" + doc.name}
                        title={this.props.intl.formatMessage({
                          defaultMessage: "Confirm Removal of template",
                          id: "header-confirm-remove-template-title",
                        })}
                        mainText={this.props.intl.formatMessage({
                          defaultMessage:
                            'Clicking "Confirm" will remove the template',
                          id: "header-confirm-remove-template-text",
                        })}
                        confirm={this.props.handleTemplateRemove(
                          doc.id,
                          this.props,
                        )}
                      />
                      <DocPreviewContainer
                        doc={doc}
                        handleClose={this.props.handleCloseTemplatePreview}
                        index={Number(index)}
                      />
                      <InviteFormContainer
                        docId={doc.id}
                        docName={doc.name}
                        docOrdered={doc.ordered}
                        isTemplate={true}
                      />
                    </React.Fragment>
                  );
                })}
              </fieldset>
            )}
            {this.props.documents.length > 0 && (
              <fieldset className="local-monosign-container">
                <legend data-testid="legend-personal">
                  <FormattedMessage
                    defaultMessage="Personal documents"
                    key="local-monosign-legend"
                  />
                </legend>
                {this.props.documents.map((doc, index) => {
                  disableClearButton = false;
                  if (doc.state === "signed") {
                    disableDlAllButton = false;
                  }
                  const docFile = docToFile(doc);
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
                  if (doc.state === "selected") disableSigning = false;

                  let docRepr = null;
                  if (doc.hasOwnProperty("pending")) {
                    const _docRepr = (
                      <DocumentOwned key={index} doc={doc} {...this.props} />
                    );
                    if (doc.state === "signed") {
                      docRepr = (
                        <>
                          {_docRepr}
                          <ConfirmDialogContainer
                            confirmId={
                              "confirm-remove-" + doc.name
                            }
                            title={this.props.intl.formatMessage({
                              defaultMessage:
                                "Confirm Removal of signed invitation",
                              id: "header-confirm-remove-signed-owned-title",
                            })}
                            mainText={this.props.intl.formatMessage({
                              defaultMessage:
                                'Clicking "Confirm" will remove the document',
                              id: "header-confirm-remove-owned-signed-text",
                            })}
                            confirm={this.props.handleSignedRemove(doc.name)}
                          />
                        </>
                      );
                    } else {
                      docRepr = _docRepr;
                    }
                  } else {
                    docRepr = (
                      <>
                        <DocumentLocal key={index} doc={doc} {...this.props} />
                        <ConfirmDialogContainer
                          confirmId={"confirm-remove-" + doc.name}
                          title={this.props.intl.formatMessage({
                            defaultMessage: "Confirm Removal of document",
                            id: "header-confirm-remove-document-title",
                          })}
                          mainText={this.props.intl.formatMessage({
                            defaultMessage:
                              'Clicking "Confirm" will remove the document',
                            id: "header-confirm-remove-document-text",
                          })}
                          confirm={this.props.handleRemoveDocument(
                            doc,
                            this.props,
                          )}
                        />
                      </>
                    );
                  }
                  return (
                    <React.Fragment key={index}>
                      {docRepr}
                      {doc.state === "unconfirmed" &&
                        doc.type.endsWith("/pdf") && (
                          <ForcedPreviewContainer
                            doc={doc}
                            index={Number(index)}
                            handleClose={this.props.handleCloseForcedPreview}
                            handleConfirm={
                              this.props.handleConfirmForcedPreview
                            }
                            handleUnConfirm={
                              this.props.handleUnConfirmForcedPreview
                            }
                          />
                        )}
                      {doc.state === "unconfirmed" &&
                        doc.type.endsWith("/xml") && (
                          <ForcedXMLPreviewContainer
                            doc={doc}
                            index={Number(index)}
                            handleClose={this.props.handleCloseForcedPreview}
                            handleConfirm={
                              this.props.handleConfirmForcedPreview
                            }
                            handleUnConfirm={
                              this.props.handleUnConfirmForcedPreview
                            }
                          />
                        )}
                      {[
                        "loaded",
                        "selected",
                        "failed-signing",
                        "signed",
                      ].includes(doc.state) &&
                        doc.type.endsWith("/pdf") && (
                          <DocPreviewContainer
                            doc={doc}
                            handleClose={this.props.handleClosePreview}
                            index={Number(index)}
                          />
                        )}
                      {[
                        "loaded",
                        "selected",
                        "failed-signing",
                        "signed",
                      ].includes(doc.state) &&
                        doc.type.endsWith("/xml") && (
                          <XMLPreviewContainer
                            doc={doc}
                            handleClose={this.props.handleClosePreview}
                            index={Number(index)}
                          />
                        )}
                      {["loaded", "selected", "signed"].includes(doc.state) && (
                        <InviteFormContainer
                          docId={doc.id}
                          docName={doc.name}
                          docOrdered={doc.ordered}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </fieldset>
            )}
          </>
        )}
        <div className={"multisign-container-" + this.props.size}>
          {!this.props.unauthn && (
            <>
              {this.props.owned.length > 0 && (
                <fieldset className="owned-multisign-container">
                  <legend data-testid="legend-inviter">
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
              <legend data-testid="legend-invited">
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
          {widgets.buttonSignSelected(
            disableSigning,
            this.props.handleSubmitToSign.bind(this),
          )}
          {!this.props.unauthn && (
            <>
              {widgets.buttonDownloadAll(
                disableDlAllButton,
                this.props.handleDownloadAll.bind(this),
              )}
              {widgets.buttonClearPersonal(
                disableClearButton,
                this.props.showConfirm("confirm-clear-session"),
                this.props.clearDb,
                this.props.intl,
              )}
            </>
          )}
        </div>
        {/**
         * This is the form that is sent to the sign service.
         * Both the data sent in the form (`binding`, `relayState`, and `signRequest`)
         * and the `destinationUrl` are obtained in the response to the call to the `create` API method.
         * This form is automatically submitted after receiving the above data from the backend
         * (see the functions -thunks- `startSigningDocuments` and `restartSigningDocuments`
         * in `frontend/src/slices/Documents.js`).
         *
         * Once this form is submitted, we loose control of the user agent in favor of the sign service;
         * and after the user finishes their interaction with the sign service, it redirects the user to the
         * callback in the backend (see the `sign_service_callback` function -view- in backend/src/edusign_webapp/views.py).
         * This callback was provided to the API in the call to the `create` method, as `returnUrl`;
         * and the API included it in the returned signRequest, which we are here in this form sending to the sign service.
         **/}
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
        {/**
         * Dummy form rendered when there's been no call to the `create` API method.
         **/}
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
        <PDFFormContainer />
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
