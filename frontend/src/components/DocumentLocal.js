import React from "react";
import { FormattedMessage } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";
import "styles/DocManager.scss";
import { useAppSelector } from "init-app/hooks";
import { useDocHelp } from "hooks/useDocHelp";
import DocumentRow from "components/DocumentRow";

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
  const props = { ...ownProps };
  const signer = useAppSelector((state) => state.main.signer_attributes);
  const getHelp = useDocHelp();
  const doc = props.doc;
  let signers = [];
  if (doc.signed && doc.signed.length > 0) {
    signers = doc.signed;
  } else if (doc.state === "signed") {
    signers = [{ name: signer.name, email: signer.mail }];
  }

  const signed = signers.length > 0 && (
    <div className="info-row" key={doc.name}>
      <span className="label">
        <FormattedMessage defaultMessage="Signed by:" key="multisign-signed" />
      </span>
      {signers.map((invite, index) => (
        <span className="item" key={invite.email}>
          {invite.name} &lt;{invite.email}&gt;
          {index < signers.length - 1 ? "," : "."}
        </span>
      ))}
    </div>
  );
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
            <DocumentRow
              props={props}
              doc={doc}
              buttons={widgets.namedSpinner(doc.name, "loading")}
            />
          )}
          {doc.state === "failed-loading" && (
            <DocumentRow
              props={props}
              doc={doc}
              size={false}
              message
              removable
            />
          )}
          {doc.state === "failed-preparing" && (
            <DocumentRow
              props={props}
              doc={doc}
              message
              removable
              buttons={widgets.retryButton(props, doc)}
            />
          )}
          {doc.state === "unconfirmed" && (
            <DocumentRow
              props={props}
              doc={doc}
              message
              removable
              buttons={widgets.forcedPreviewButton(props, doc)}
            />
          )}
          {(doc.state === "loaded" || doc.state === "selected") && (
            <DocumentRow
              props={props}
              doc={doc}
              selectable
              removable
              buttons={
                <>
                  <ESDropdown doc={doc}>
                    {doc.type === "application/pdf" &&
                      menu.createTemplateMenuItem(props, doc)}
                    {doc.signed_draft &&
                      menu.downloadPersonalDraftMenuItem(props, doc)}
                    {menu.previewMenuItem(props, doc)}
                  </ESDropdown>
                  {widgets.multiSignButton(props, doc)}
                </>
              }
            />
          )}
          {doc.state === "signing" && (
            <DocumentRow
              props={props}
              doc={doc}
              buttons={widgets.namedSpinner(doc.name, "signing")}
            />
          )}
          {doc.state === "signed" && (
            <DocumentRow
              props={props}
              doc={doc}
              removable
              buttons={
                <>
                  <ESDropdown doc={doc}>
                    {menu.previewMenuItem(props, doc)}
                  </ESDropdown>
                  {widgets.multiSignButton(props, doc)}
                  {widgets.downloadSignedButton(props, doc)}
                </>
              }
            />
          )}
          {doc.state === "failed-signing" && (
            <DocumentRow
              props={props}
              doc={doc}
              selectable
              message
              removable
              buttons={
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                </ESDropdown>
              }
            />
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
