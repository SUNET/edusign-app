import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";

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
function DocumentLocal(ownProps) {
  const intl = useIntl();
  const props = { ...ownProps, intl };
  const getHelp = (msg) => {
    const msgs = {
      "loading-title": intl.formatMessage({
        defaultMessage: "Loading document",
        id: "docmanager-help-loading-title",
      }),
      loading: intl.formatMessage({
        defaultMessage: "Please wait while the document loads",
        id: "docmanager-help-loading",
      }),
      "loaded-title": intl.formatMessage({
        defaultMessage: "Document loaded",
        id: "docmanager-help-loaded-title",
      }),
      loaded: intl.formatMessage({
        defaultMessage:
          'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign selected documents"',
        id: "docmanager-help-loaded",
      }),
      "failed-loading-title": intl.formatMessage({
        defaultMessage: "Failed loading document",
        id: "docmanager-help-failed-loading-title",
      }),
      "failed-loading": intl.formatMessage({
        defaultMessage: "This does not seem to be a valid document",
        id: "docmanager-help-failed-loading",
      }),
      "unconfirmed-title": intl.formatMessage({
        defaultMessage: "This document has not yet been approved",
        id: "docmanager-help-unconfirmed-title",
      }),
      unconfirmed: intl.formatMessage({
        defaultMessage:
          'Click on the button labeled "Preview and approve" to review the document and confirm that you approve it for signature',
        id: "docmanager-help-unconfirmed",
      }),
      "selected-title": intl.formatMessage({
        defaultMessage: "Document selected for signing",
        id: "docmanager-help-selected-title",
      }),
      selected: intl.formatMessage({
        defaultMessage:
          'Click on the button below labelled "Sign selected documents" to sign this document',
        id: "docmanager-help-selected",
      }),
      "failed-preparing-title": intl.formatMessage({
        defaultMessage: "Failed preparing document",
        id: "docmanager-help-failed-preparing-title",
      }),
      "failed-preparing": intl.formatMessage({
        defaultMessage:
          'There was a problem preparing the document for signing, clik on the button labelled "retry" to try again',
        id: "docmanager-help-failed-preparing",
      }),
      "signing-title": intl.formatMessage({
        defaultMessage: "Signing document",
        id: "docmanager-help-signing-title",
      }),
      signing: intl.formatMessage({
        defaultMessage: "Please wait while the document is signed",
        id: "docmanager-help-signing",
      }),
      "failed-signing-title": intl.formatMessage({
        defaultMessage: "Failed signing document",
        id: "docmanager-help-failed-signing-title",
      }),
      "failed-signing": intl.formatMessage({
        defaultMessage:
          'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign selected documents"',
        id: "docmanager-help-failed-signing",
      }),
      "signed-title": intl.formatMessage({
        defaultMessage: "Document signed",
        id: "docmanager-help-signed-title",
      }),
      signed: intl.formatMessage({
        defaultMessage:
          'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
        id: "docmanager-help-signed",
      }),
    };
    return msgs[msg];
  };

  const doc = props.doc;
  let signed;
  if (doc.signed && doc.signed.length > 0) {
    signed = (
      <div className="doc-container-info-row" key={doc.name}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Signed by:"
            key="multisign-signed"
          />
        </span>
        <span className="info-row-items">
          {doc.signed.map((invite, index) => {
            return (
              <span className="info-row-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;{" "}
                {index < doc.signed.length - 1 ? "," : "."}
              </span>
            );
          })}
        </span>
      </div>
    );
  } else {
    signed =
      (doc.state === "signed" && (
        <div className="doc-container-info-row" key={doc.name}>
          <span className="info-row-label">
            <FormattedMessage
              defaultMessage="Signed by:"
              key="multisign-owned-signed"
            />
          </span>
          <span className="info-row-items">
            <span className="info-row-item">
              {props.name} &lt;{props.mail}&gt;.
            </span>
          </span>
        </div>
      )) ||
      "";
  }
  // validated is unused for now
  const validated =
    (doc.state === "signed" && (
      <div className="doc-container-info-row" key={doc.name}>
        <span className="info-row-label">
          {(doc.validated && (
            <FormattedMessage
              defaultMessage="Validated"
              key="multisign-owned-signed-validated"
            />
          )) || (
            <FormattedMessage
              defaultMessage="Not validated"
              key="multisign-owned-signed-non-validated"
            />
          )}
        </span>
      </div>
    )) ||
    "";

  return (
    <ESPopover
      helpId={"local-doc-container-" + doc.name}
      key={doc.name}
      title={getHelp(doc.state + "-title")}
      body={getHelp(doc.state)}
    >
      <div
        className={"doc-flex-container " + doc.state}
        data-testid={`representation-for-doc-${doc.name}`}
        id={"local-doc-" + doc.name}
        key="0"
      >
        <div className="doc-detail-block">
          {doc.state === "loading" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              <div className="buttons-flex">
                {widgets.namedSpinner(doc.name, "loading")}
              </div>
            </div>
          )}
          {doc.state === "failed-loading" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
          {doc.state === "failed-preparing" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                {widgets.retryButton(props, doc)}
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
          {doc.state === "unconfirmed" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                {widgets.forcedPreviewButton(props, doc)}
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
          {(doc.state === "loaded" || doc.state === "selected") && (
            <div className="name-and-buttons">
              {widgets.selectDoc(props, doc)}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {doc.type === "application/pdf" &&
                    menu.createTemplateMenuItem(props, doc)}
                  {doc.signed_draft &&
                    menu.downloadPersonalDraftMenuItem(props, doc)}
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
                {widgets.multiSignButton(props, doc)}
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
          {doc.state === "signing" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              <div className="buttons-flex">
                {widgets.namedSpinner(doc.name, "signing")}
              </div>
            </div>
          )}
          {doc.state === "signed" && (
            <div className="name-and-buttons">
              {widgets.dummySelectDoc()}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
                {widgets.multiSignButton(props, doc)}
                {widgets.downloadSignedButton(props, doc)}
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
          {doc.state === "failed-signing" && (
            <div className="name-and-buttons">
              {widgets.selectDoc(props, doc)}
              {widgets.docSize(doc)}
              {widgets.docName(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
                {widgets.removeConfirmButton(
                  props,
                  doc,
                  `confirm-remove-${doc.name}`,
                )}
              </div>
            </div>
          )}
        </div>
        {signed}
        {preparePrevSigs(doc, props.size)}
        <widgets.InfoLine doc={doc} />
        <widgets.InfoLine2 doc={doc} />
      </div>
    </ESPopover>
  );
}

export default DocumentLocal;
