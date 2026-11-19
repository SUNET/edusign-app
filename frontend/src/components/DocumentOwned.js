import React from "react";
import { FormattedMessage } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";
import InviteEditFormContainer from "containers/InviteEditForm";
import { useDocHelp } from "hooks/useDocHelp";
import DocumentRow from "./DocumentRow";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
function DocumentOwned(props) {
  const getHelp = useDocHelp();
  const doc = props.doc;
  const editForm =
    (["loaded", "selected", "failed-signing", "incomplete"].includes(
      doc.state,
    ) && (
      <InviteEditFormContainer
        docKey={doc.key}
        docOrdered={doc.ordered}
        docSendSigned={doc.sendsigned}
        docSkipFinal={doc.skipfinal}
      />
    )) ||
    "";
  const pending =
    (doc.state === "incomplete" && (
      <div className="info-row">
        <span className="label">
          <FormattedMessage
            defaultMessage="Waiting for signatures by:"
            key="multisign-owned-waiting"
          />
        </span>
        {doc.pending.map((invite, index) => {
          return (
            <span className="item" key={index}>
              {invite.name} &lt;{invite.email}&gt;{" "}
              {index < doc.pending.length - 1 ? "," : "."}
            </span>
          );
        })}
      </div>
    )) ||
    "";
  const signed = (
    <div className="info-row">
      <span className="label">
        <FormattedMessage
          defaultMessage="Signed by:"
          key="multisign-owned-signed"
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
  const declined = doc.declined !== undefined && (
    <div className="info-row">
      <span className="label">
        <FormattedMessage
          defaultMessage="Declined to sign by:"
          key="multisign-owned-declined"
        />
      </span>
      {doc.declined.map((invite, index) => {
        return (
          <span className="item" key={index}>
            {invite.name} &lt;{invite.email}&gt;{" "}
            {index < doc.declined.length - 1 ? "," : "."}
          </span>
        );
      })}
    </div>
  );
  const invites = (
    <>
      {doc.pending.length > 0 && <>{pending}</>}
      {doc.signed.length > 0 && <>{signed}</>}
      {doc.declined !== undefined && doc.declined.length > 0 && <>{declined}</>}
    </>
  );
  return (
    <>
      <ESPopover
        helpId={"owned-doc-container-" + doc.name}
        key={doc.name}
        title={getHelp(doc.state + "-title")}
        body={getHelp(doc.state)}
      >
        <div
          className={"doc-flex-container invitation-multisign " + doc.state}
          data-testid={`representation-for-doc-${doc.name}`}
        >
          <div className="doc-detail-block">
            {doc.state === "incomplete" && (
              <DocumentRow
                props={props}
                doc={doc}
                removable
                buttons={
                  <ESDropdown doc={doc}>
                    {menu.editInvitationMenuItem(props, doc)}
                    {menu.resendMenuItem(props, doc)}
                    {menu.previewMenuItem(props, doc)}
                  </ESDropdown>
                }
              />
            )}
            {["loaded", "selected", "failed-signing"].includes(doc.state) && (
              <DocumentRow
                props={props}
                doc={doc}
                selectable
                message
                removable
                buttons={
                  <>
                    <ESDropdown doc={doc}>
                      {menu.editInvitationMenuItem(props, doc)}
                      {menu.previewMenuItem(props, doc)}
                    </ESDropdown>
                    {widgets.skipSignatureButton(props, doc)}
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
                    {doc.signed.length > 0 &&
                      widgets.downloadSignedButton(props, doc)}
                  </>
                }
              />
            )}
            {invites}
            {preparePrevSigs(doc, props.size)}
            <widgets.InfoLine doc={doc} />
            <widgets.InfoLine2 doc={doc} />
          </div>
        </div>
      </ESPopover>
      {editForm}
    </>
  );
}

export default DocumentOwned;
