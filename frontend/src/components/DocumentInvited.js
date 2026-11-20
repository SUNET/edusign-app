import React from "react";
import { FormattedMessage } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import { useDocHelp } from "hooks/useDocHelp";
import * as widgets from "components/widgets";
import DocumentRow from "components/DocumentRow";
import { preparePrevSigs } from "components/utils";

/**
 * @desc eduSign component showing the representation of a document
 * the logged in user has been invited to sign.
 *
 * @component
 */
function DocumentInvited(props) {
  const getHelp = useDocHelp();
  const doc = props.doc;

  // The lists of signers in their different states, shown below the row.
  const inviteRow = (label, invitees) =>
    invitees !== undefined &&
    invitees.length > 0 && (
      <div className="info-row">
        <span className="label">{label}</span>
        {invitees.map((invite, index) => (
          <span className="item" key={invite.email}>
            {invite.name} &lt;{invite.email}&gt;
            {index < invitees.length - 1 ? "," : "."}
          </span>
        ))}
      </div>
    );

  const invites = (
    <>
      {inviteRow(
        <FormattedMessage defaultMessage="Invited by:" key="invited-by" />,
        [doc.owner],
      )}
      {inviteRow(
        <FormattedMessage
          defaultMessage="Waiting for signatures by:"
          key="multisign-owned-waiting"
        />,
        doc.pending,
      )}
      {inviteRow(
        <FormattedMessage defaultMessage="Signed by:" key="multisign-signed" />,
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

  return (
    <ESPopover
      helpId={"invited-doc-container-" + doc.key}
      key={doc.key}
      title={getHelp(doc.state + "-title")}
      body={getHelp(doc.state)}
    >
      <div
        className={"doc-flex-container " + doc.state}
        data-testid={`representation-for-doc-${doc.key}`}
      >
        <div className="doc-detail-block" id={"invitee-doc-" + doc.key}>
          {doc.state === "unconfirmed" && (
            <DocumentRow
              props={props}
              doc={doc}
              buttons={
                <>
                  <ESDropdown doc={doc}>
                    {menu.downloadDraftMenuItem(props, doc)}
                  </ESDropdown>
                  {widgets.forcedPreviewButton(props, doc)}
                  {widgets.declineSignatureButton(props, doc)}
                </>
              }
            />
          )}
          {["loaded", "selected", "failed-signing"].includes(doc.state) && (
            <DocumentRow
              props={props}
              doc={doc}
              selectable
              message
              buttons={
                <>
                  <ESDropdown doc={doc}>
                    {menu.previewMenuItem(props, doc)}
                    {menu.downloadDraftMenuItem(props, doc)}
                  </ESDropdown>
                  {doc.state === "selected" &&
                    (props.using_bankid || props.using_freja) &&
                    widgets.signButton(props, doc)}
                  {widgets.declineSignatureButton(props, doc)}
                </>
              }
            />
          )}
          {doc.state === "signing" && (
            <DocumentRow
              props={props}
              doc={doc}
              buttons={widgets.namedSpinner(doc.key, "signing")}
            />
          )}
          {doc.state === "signed" && (
            <DocumentRow
              props={props}
              doc={doc}
              buttons={widgets.downloadDraftButton(props, doc)}
            />
          )}
          {doc.state === "declined" && (
            <DocumentRow
              props={props}
              doc={doc}
              message
              buttons={widgets.dummyButton()}
            />
          )}
          {doc.state === "failed-loa" && (
            <DocumentRow
              props={props}
              doc={doc}
              buttons={widgets.declineSignatureButton(props, doc)}
            />
          )}

          {doc.state === "failed-loa" && widgets.showMessage(doc)}
          {invites}
          {preparePrevSigs(doc, props.size)}
          <widgets.InfoLine doc={doc} />
        </div>
      </div>
    </ESPopover>
  );
}

export default DocumentInvited;
