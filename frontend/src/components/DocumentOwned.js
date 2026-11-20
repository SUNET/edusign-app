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

  const inviteRow = (label, invitees) =>
    invitees !== undefined &&
    invitees.length > 0 && (
      <div className="info-row">
        <span className="label">{label}</span>
        {invitees.map((invite, index) => (
          <span className="item" key={invite.email}>
            {invite.name} &lt;{invite.email}&gt;{" "}
            {index < invitees.length - 1 ? "," : "."}
          </span>
        ))}
      </div>
    );

  const invites = (
    <>
      {doc.state === "incomplete" &&
        inviteRow(
          <FormattedMessage
            defaultMessage="Waiting for signatures by:"
            key="multisign-owned-waiting"
          />,
          doc.pending,
        )}
      {inviteRow(
        <FormattedMessage
          defaultMessage="Signed by:"
          key="multisign-owned-signed"
        />,
        doc.signed,
      )}
      {inviteRow(
        <FormattedMessage
          defaultMessage="Declined to sign by:"
          key="multisign-owned-declined"
        />,
        doc.declined,
      )}
    </>
  );

  const rowForState = () => {
    switch (doc.state) {
      case "incomplete":
        return {
          removable: true,
          buttons: (
            <ESDropdown doc={doc}>
              {menu.editInvitationMenuItem(props, doc)}
              {menu.resendMenuItem(props, doc)}
              {menu.previewMenuItem(props, doc)}
            </ESDropdown>
          ),
        };
      case "loaded":
      case "selected":
      case "failed-signing":
        return {
          selectable: true,
          message: true,
          removable: true,
          buttons: (
            <>
              <ESDropdown doc={doc}>
                {menu.editInvitationMenuItem(props, doc)}
                {menu.previewMenuItem(props, doc)}
              </ESDropdown>
              {widgets.skipSignatureButton(props, doc)}
            </>
          ),
        };
      case "signing":
        return {
          buttons: widgets.namedSpinner(doc.name, "signing"),
        };
      case "signed":
        return {
          removable: true,
          buttons: (
            <>
              <ESDropdown doc={doc}>
                {menu.previewMenuItem(props, doc)}
              </ESDropdown>
              {widgets.multiSignButton(props, doc)}
              {doc.signed.length > 0 &&
                widgets.downloadSignedButton(props, doc)}
            </>
          ),
        };
      default:
        return null;
    }
  };

  const row = rowForState();

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
            {row && <DocumentRow props={props} doc={doc} {...row} />}
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
