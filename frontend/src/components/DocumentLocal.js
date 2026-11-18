import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";
import "styles/DocManager.scss";
import { useAppSelector } from "init-app/hooks";
import { useDocHelp } from "hooks/useDocHelp";

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
  const signer = useAppSelector((state) => state.main.signer_attributes);
  const getHelp = useDocHelp();

  const doc = props.doc;
  let signed;
  if (doc.signed && doc.signed.length > 0) {
    signed = (
      <div className="info-row" key={doc.name}>
        <span className="label">
          <FormattedMessage
            defaultMessage="Signed by:"
            key="multisign-signed"
          />
        </span>
        {doc.signed.map((invite, index) => {
          return (
            <span className="item" key={index}>
              {invite.name} &lt;{invite.email}&gt;{" "}
              {index < doc.signed.length - 1 ? "," : "."}
            </span>
          );
        })}
      </div>
    );
  } else {
    signed =
      (doc.state === "signed" && (
        <div className="info-row" key={doc.name}>
          <span className="label">
            <FormattedMessage
              defaultMessage="Signed by:"
              key="multisign-owned-signed"
            />
          </span>
          <span className="item">
            {signer.name} &lt;{signer.mail}&gt;.
          </span>
        </div>
      )) ||
      "";
  }
  // validated is unused for now
  const validated =
    (doc.state === "signed" && (
      <div className="info-row" key={doc.name}>
        <span className="label">
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
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                {widgets.namedSpinner(doc.name, "loading")}
              </div>
            </div>
          )}
          {doc.state === "failed-loading" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.showMessage(doc)}
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
            </div>
          )}
          {doc.state === "failed-preparing" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                {widgets.retryButton(props, doc)}
              </div>
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
            </div>
          )}
          {doc.state === "unconfirmed" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                {widgets.forcedPreviewButton(props, doc)}
              </div>
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
            </div>
          )}
          {(doc.state === "loaded" || doc.state === "selected") && (
            // here //
            <div className="select-column">
              {widgets.selectDoc(props, doc)}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {doc.type === "application/pdf" &&
                    menu.createTemplateMenuItem(props, doc)}
                  {doc.signed_draft &&
                    menu.downloadPersonalDraftMenuItem(props, doc)}
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
                {widgets.multiSignButton(props, doc)}
              </div>
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
            </div>
          )}
          {doc.state === "signing" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                {widgets.namedSpinner(doc.name, "signing")}
              </div>
            </div>
          )}
          {doc.state === "signed" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
                {widgets.multiSignButton(props, doc)}
                {widgets.downloadSignedButton(props, doc)}
              </div>
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
            </div>
          )}
          {doc.state === "failed-signing" && (
            <div className="select-column">
              {widgets.selectDoc(props, doc)}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
              </div>
              {widgets.removeConfirmButton(
                props,
                doc,
                `confirm-remove-${doc.name}`,
              )}
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
