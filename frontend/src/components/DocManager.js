import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, useIntl } from "react-intl";
import { injectIntl } from "init-app/intl";

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
import { useAppSelector } from "init-app/hooks";

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
function DocManager(props) {
  // The signing form is only rendered once the backend has returned the data
  // the sign service needs, and submitting it hands the user over to that
  // service. The effect has no dependency array because the previous
  // componentDidUpdate ran after every update.

  const documents = useAppSelector((state) => state.documents.documents);
  const templates = useAppSelector((state) => state.template.documents);
  const destinationUrl = useAppSelector(
    (state) => state.main.signingData.destination_url,
  );
  const binding = useAppSelector((state) => state.main.signingData.binding);
  const relayState = useAppSelector(
    (state) => state.main.signingData.relay_state,
  );
  const signRequest = useAppSelector(
    (state) => state.main.signingData.sign_request,
  );
  const size = useAppSelector((state) => state.main.size);
  const pending = useAppSelector((state) => state.main.pending_multisign);
  const owned = useAppSelector((state) => state.main.owned_multisign);
  const unauthn = useAppSelector((state) => state.main.unauthn);
  const invitedUnauthn = useAppSelector(
    (state) => state.main.pending_multisign.length > 0,
  );
  const using_bankid = useAppSelector(
    (state) => state.main.signer_attributes.using_bankid,
  );
  const using_freja = useAppSelector(
    (state) => state.main.signer_attributes.using_freja,
  );
  const intl = useIntl();

  useEffect(() => {
    const form = document.getElementById("signing-form");
    if (!form) return;
    if (form.requestSubmit) {
      form.requestSubmit();
    } else {
      // Safari does not implement the requestSubmit API
      form.submit();
    }
  });

  let disableSigning = true;
  let disableDlAllButton = true;
  [pending, owned].forEach((docs) => {
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
      {unauthn && invitedUnauthn && (
        <div className="invited-unauthn-title">
          <FormattedMessage
            defaultMessage="You have been invited to sign the following document(s)"
            key="invited-unauthn-title"
          />
        </div>
      )}
      {unauthn && !invitedUnauthn && (
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
      {/* The groups that need action come first: documents the user is
            invited to sign, then documents the user is waiting on others
            to sign. The personal documents, which can be many, come last. */}
      <div className={"multisign-container-" + size}>
        {pending.length > 0 && (
          <fieldset className="invited-multisign-container">
            {(!using_bankid && !using_freja && (
              <legend data-testid="legend-invited">
                <FormattedMessage
                  defaultMessage="Documents you are invited to sign"
                  key="invited-multisign-legend"
                />
              </legend>
            )) ||
              (pending[0].state === "signed" && (
                <p className="invited-legend-title">
                  <FormattedMessage
                    defaultMessage="The draft document can be downloaded now, but will disappear when this window is closed. The fully signed document will be available from the person who invited the signature."
                    key="local-invited-legend-title"
                  />
                </p>
              ))}
            <InvitedContainer />
          </fieldset>
        )}
        {!unauthn && (
          <>
            {owned.length > 0 && (
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
      </div>
      {!unauthn && (
        <>
          {templates.length > 0 && (
            <fieldset className="local-template-container">
              <legend data-testid="legend-templates">
                <FormattedMessage
                  defaultMessage="Templates"
                  key="local-templates-legend"
                />
              </legend>
              {templates.map((doc, index) => {
                return (
                  <React.Fragment key={doc.name}>
                    <DocumentTemplate key={doc.name} doc={doc} {...props} />
                    <ConfirmDialogContainer
                      confirmId={"confirm-remove-" + doc.name}
                      title={intl.formatMessage({
                        defaultMessage: "Confirm Removal of template",
                        id: "header-confirm-remove-template-title",
                      })}
                      mainText={intl.formatMessage({
                        defaultMessage:
                          'Clicking "Confirm" will remove the template',
                        id: "header-confirm-remove-template-text",
                      })}
                      confirm={props.handleTemplateRemove(doc.id, props)}
                    />
                    <DocPreviewContainer
                      doc={doc}
                      handleClose={props.handleCloseTemplatePreview}
                      index={Number(index)}
                    />
                    <InviteFormContainer
                      docId={doc.id}
                      docName={doc.name}
                      docOrdered={doc.ordered}
                      docAllowbankid={doc.allowbankid}
                      isTemplate={true}
                    />
                  </React.Fragment>
                );
              })}
            </fieldset>
          )}
          {documents.length > 0 && (
            <fieldset className="local-monosign-container">
              <legend data-testid="legend-personal">
                <h2 className="heading">
                  <FormattedMessage
                    defaultMessage="Personal documents"
                    key="local-monosign-legend"
                  />
                </h2>
              </legend>
              <p className="lead-text">
                <FormattedMessage
                  defaultMessage="Personal documents are stored in your browser. When signed, we recommend to store them in a separate place for later use."
                  key="local-monosign-legend-title"
                />
              </p>
              {documents.map((doc, index) => {
                disableClearButton = false;
                if (doc.state === "signed") {
                  disableDlAllButton = false;
                }
                const docFile = docToFile(doc);
                if (docFile === null) {
                  doc = {
                    ...doc,
                    state: "failed-loading",
                    message: intl.formatMessage({
                      defaultMessage: "Malformed PDF",
                      id: "malformed-pdf",
                    }),
                  };
                }
                if (doc.state === "selected") disableSigning = false;

                let docRepr = null;
                if (doc.hasOwnProperty("pending")) {
                  const _docRepr = (
                    <DocumentOwned key={doc.name} doc={doc} {...props} />
                  );
                  if (doc.state === "signed") {
                    docRepr = (
                      <>
                        {_docRepr}
                        <ConfirmDialogContainer
                          confirmId={"confirm-remove-" + doc.name}
                          title={intl.formatMessage({
                            defaultMessage:
                              "Confirm Removal of signed invitation",
                            id: "header-confirm-remove-signed-owned-title",
                          })}
                          mainText={intl.formatMessage({
                            defaultMessage:
                              'Clicking "Confirm" will remove the document',
                            id: "header-confirm-remove-owned-signed-text",
                          })}
                          confirm={props.handleSignedRemove(doc.name)}
                        />
                      </>
                    );
                  } else {
                    docRepr = _docRepr;
                  }
                } else {
                  docRepr = (
                    <>
                      <DocumentLocal key={doc.name} doc={doc} {...props} />
                      <ConfirmDialogContainer
                        confirmId={"confirm-remove-" + doc.name}
                        title={intl.formatMessage({
                          defaultMessage: "Confirm Removal of document",
                          id: "header-confirm-remove-document-title",
                        })}
                        mainText={intl.formatMessage({
                          defaultMessage:
                            'Clicking "Confirm" will remove the document',
                          id: "header-confirm-remove-document-text",
                        })}
                        confirm={props.handleRemoveDocument(doc, props)}
                      />
                    </>
                  );
                }
                return (
                  <React.Fragment key={doc.name}>
                    {docRepr}
                    {doc.state === "unconfirmed" &&
                      doc.type.endsWith("/pdf") && (
                        <ForcedPreviewContainer
                          doc={doc}
                          index={Number(index)}
                          handleClose={props.handleCloseForcedPreview}
                          handleConfirm={props.handleConfirmForcedPreview}
                          handleUnConfirm={props.handleUnConfirmForcedPreview}
                        />
                      )}
                    {doc.state === "unconfirmed" &&
                      doc.type.endsWith("/xml") && (
                        <ForcedXMLPreviewContainer
                          doc={doc}
                          index={Number(index)}
                          handleClose={props.handleCloseForcedPreview}
                          handleConfirm={props.handleConfirmForcedPreview}
                          handleUnConfirm={props.handleUnConfirmForcedPreview}
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
                          handleClose={props.handleClosePreview}
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
                          handleClose={props.handleClosePreview}
                          index={Number(index)}
                        />
                      )}
                    {["loaded", "selected", "signed"].includes(doc.state) && (
                      <InviteFormContainer
                        docId={doc.id}
                        docName={doc.name}
                        docOrdered={doc.ordered}
                        docAllowbankid={doc.allowbankid}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </fieldset>
          )}
        </>
      )}
      <div id="adjust-vertical-space" />
      {!using_bankid && !using_freja && documents.length > 0 && (
        <div id="global-buttons-wrapper" className="buttons-wrapper">
          {widgets.buttonSignSelected(disableSigning, props.handleSubmitToSign)}
          {!unauthn && (
            <>
              {widgets.buttonDownloadAll(
                disableDlAllButton,
                props.handleDownloadAll,
              )}
              {widgets.buttonClearPersonal(
                disableClearButton,
                props.showConfirm("confirm-clear-session"),
                props.clearDb,
                intl,
              )}
            </>
          )}
        </div>
      )}
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
      {destinationUrl !== undefined &&
        destinationUrl !== "https://dummy.destination.url" && (
          <div>
            <form
              id="signing-form"
              data-testid="signing-form"
              action={destinationUrl}
              method="post"
            >
              <input type="hidden" name="Binding" value={binding} />
              <input type="hidden" name="RelayState" value={relayState} />
              <input type="hidden" name="EidSignRequest" value={signRequest} />
            </form>
          </div>
        )}
      {/**
       * Dummy form rendered when there's been no call to the `create` API method.
       **/}
      {destinationUrl === "https://dummy.destination.url" && (
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
