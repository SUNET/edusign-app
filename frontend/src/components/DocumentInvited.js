import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";
import { ESTooltip } from "containers/Overlay";

import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";

/**
 * @desc eduSign component showing a list of signing invitations to the logged in user.
 *
 * @component
 */
class DocumentInvited extends Component {
  getHelp(msg) {
    const msgs = {
      "loaded-title": this.props.intl.formatMessage({
        defaultMessage: "Document loaded",
        id: "docmanager-help-loaded-title",
      }),
      loaded: this.props.intl.formatMessage({
        defaultMessage:
          'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign Selected Documents"',
        id: "docmanager-help-loaded",
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
          "You have successfully signed the document. Note that if you reload the app you will not have access the document any more. The inviter has been notified of your signature, it is up to them to decide if the system should send you the final signed version.",
        id: "docmanager-help-signed-invited",
      }),
      "declined-title": this.props.intl.formatMessage({
        defaultMessage: "Signature declined",
        id: "docmanager-help-declined-title",
      }),
      declined: this.props.intl.formatMessage({
        defaultMessage:
          "You have declined to sign this document. It will dissapear from here if you reload the app.",
        id: "docmanager-help-declined-invited",
      }),
    };
    return msgs[msg];
  }
  render() {
    const doc = this.props.doc;
    const invitedBy = (
      <div className="doc-container-invitedby-row">
        <span className="invited-by-label">
          <FormattedMessage defaultMessage="Invited by:" key="invited-by" />
        </span>
        <span className="owner-item">
          {doc.owner.name} &lt;{doc.owner.email}&gt;
        </span>
      </div>
    );
    const pending = (
      <div className="doc-container-pending-row">
        <span className="pending-invites-label">
          <FormattedMessage
            defaultMessage="Waiting for signatures by:"
            key="multisign-owned-waiting"
          />
        </span>
        <span className="pending-invites-items">
          {doc.pending.map((invite, index) => {
            return (
              <span className="pending-invite-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;
              </span>
            );
          })}
        </span>
      </div>
    );
    const signed = (
      <div className="doc-container-signed-row">
        <span className="signed-invites-label">
          <FormattedMessage
            defaultMessage="Signed by:"
            key="multisign-signed"
          />
        </span>
        <span className="signed-invites-items">
          {doc.signed.map((invite, index) => {
            return (
              <span className="signed-invite-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;
              </span>
            );
          })}
        </span>
      </div>
    );
    const declined = (
      <div className="doc-container-declined-row">
        <span className="declined-invites-label">
          <FormattedMessage
            defaultMessage="Declined to sign by:"
            key="multisign-owned-declined"
          />
        </span>
        <span className="declined-invites-items">
          {doc.declined.map((invite, index) => {
            return (
              <span className="declined-invite-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;
              </span>
            );
          })}
        </span>
      </div>
    );
    const invites = (
      <>
        {invitedBy}
        {doc.pending.length > 0 && <>{pending}</>}
        {doc.signed.length > 0 && <>{signed}</>}
        {doc.declined !== undefined && doc.declined.length > 0 && (
          <>{declined}</>
        )}
      </>
    );
    let requiredLoa = "";
    if (doc.loa !== undefined && !("", "none").includes(doc.loa)) {
      const loa = doc.loa.split(',');
      const loaName = loa[1];
      const loaValue = loa[0];
      requiredLoa = (
        <div className="doc-container-loa-row">
          <span className="invite-loa-label">
            <FormattedMessage
              defaultMessage="Required security level:"
              key="multisign-loa"
            />
          </span>
          &nbsp;
          <ESTooltip
            tooltip={loaValue}
          >
            <span className="invite-loa-item">
              {loaName}
            </span>
        </ESTooltip>
        </div>
      );
    }
    return (
      <>
        <ESPopover
          key={doc.name}
          title={this.getHelp(doc.state + "-title")}
          body={this.getHelp(doc.state)}
        >
          {(this.props.size === "lg" && (
            <div className={"invitation-multisign " + doc.state}>
              <div className="invitation-multisign-request">
                <div
                  className={"invitation-name-and-buttons-" + this.props.size}
                >
                  {doc.state === "unconfirmed" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.forcedPreviewButton(this.props, doc)}
                      {widgets.declineSignatureButton(this.props, doc)}
                    </>
                  )}
                  {["loaded", "selected", "failed-signing"].includes(
                    doc.state
                  ) && (
                    <>
                      {widgets.selectDoc(this.props, doc)}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.showMessage(doc)}
                      {widgets.previewButton(this.props, doc)}
                      {widgets.declineSignatureButton(this.props, doc)}
                    </>
                  )}
                  {doc.state === "signing" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.namedSpinner(doc.name, "signing")}
                    </>
                  )}
                  {doc.state === "signed" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.downloadSignedButton(this.props, doc)}
                    </>
                  )}
                  {doc.state === "declined" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.showMessage(doc)}
                      {widgets.dummyButton()}
                    </>
                  )}
                </div>
                {requiredLoa}
                {invites}
                {preparePrevSigs(doc)}
              </div>
            </div>
          )) || (
            <div className={"doc-flex-container-sm " + doc.state}>
              {doc.state === "unconfirmed" && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    {widgets.forcedPreviewButton(this.props, doc)}
                    {widgets.declineSignatureButton(this.props, doc)}
                  </div>
                </>
              )}
              {["loaded", "selected", "failed-signing"].includes(doc.state) && (
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
                    {widgets.declineSignatureButton(this.props, doc)}
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
                  </div>
                </>
              )}
              {doc.state === "declined" && (
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
                    {widgets.dummyButton()}
                  </div>
                </>
              )}
              {requiredLoa}
              {invites}
              {preparePrevSigs(doc)}
            </div>
          )}
        </ESPopover>
      </>
    );
  }
}

DocumentInvited.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(DocumentInvited);
