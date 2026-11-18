import React from "react";
import { FormattedMessage } from "react-intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import { useDocHelp } from "hooks/useDocHelp";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";

/**
 * @desc eduSign component showing a list of signing invitations to the logged in user.
 *
 * @component
 */
function DocumentInvited(props) {
  const getHelp = useDocHelp();
  const doc = props.doc;
  const invitedBy = (
    <div className="info-row">
      <span className="label">
        <FormattedMessage defaultMessage="Invited by:" key="invited-by" />
      </span>
      <span className="item">
        {doc.owner.name} &lt;{doc.owner.email}&gt;.
      </span>
    </div>
  );
  const pending = (
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
  );
  const signed = (
    <div className="info-row">
      <span className="label">
        <FormattedMessage defaultMessage="Signed by:" key="multisign-signed" />
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
  const declined = (
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
      {invitedBy}
      {doc.pending.length > 0 && <>{pending}</>}
      {doc.signed.length > 0 && <>{signed}</>}
      {doc.declined !== undefined && doc.declined.length > 0 && <>{declined}</>}
    </>
  );
  const failedLoA =
    (doc.state === "failed-loa" && <>{widgets.showMessage(doc)}</>) || "";
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
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.downloadDraftMenuItem(props, doc)}
                </ESDropdown>
                {widgets.forcedPreviewButton(props, doc)}
                {widgets.declineSignatureButton(props, doc)}
              </div>
            </div>
          )}
          {["loaded", "selected", "failed-signing"].includes(doc.state) && (
            <div className="select-column">
              {widgets.selectDoc(props, doc)}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">
                <ESDropdown doc={doc}>
                  {menu.previewMenuItem(props, doc)}
                  {menu.downloadDraftMenuItem(props, doc)}
                </ESDropdown>
                {doc.state === "selected" &&
                  (props.using_bankid || props.using_freja) &&
                  widgets.signButton(props, doc)}
                {widgets.declineSignatureButton(props, doc)}
              </div>
            </div>
          )}
          {doc.state === "signing" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.namedSpinner(doc.key, "signing")}
            </div>
          )}
          {doc.state === "signed" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                {widgets.downloadDraftButton(props, doc)}
              </div>
            </div>
          )}
          {doc.state === "declined" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              {widgets.showMessage(doc)}
              <div className="buttons-flex">{widgets.dummyButton()}</div>
            </div>
          )}
          {doc.state === "failed-loa" && (
            <div className="select-column">
              {widgets.dummySelectDoc()}
              {widgets.docName(doc)}
              {widgets.docSize(doc)}
              <div className="buttons-flex">
                {widgets.declineSignatureButton(props, doc)}
              </div>
            </div>
          )}

          {failedLoA}
          {invites}
          {preparePrevSigs(doc, props.size)}
          <widgets.InfoLine doc={doc} />
        </div>
      </div>
    </ESPopover>
  );
}

export default DocumentInvited;
