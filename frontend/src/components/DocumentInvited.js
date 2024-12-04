import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESPopover, ESTooltip } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";

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
          'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign selected documents"',
        id: "docmanager-help-loaded",
      }),
      "unconfirmed-title": this.props.intl.formatMessage({
        defaultMessage: "This document has not yet been approved",
        id: "docmanager-help-unconfirmed-title",
      }),
      unconfirmed: this.props.intl.formatMessage({
        defaultMessage:
          'Click on the button labeled "Preview and approve" to review the document and confirm that you approve it for signature',
        id: "docmanager-help-unconfirmed",
      }),
      "selected-title": this.props.intl.formatMessage({
        defaultMessage: "Document selected for signing",
        id: "docmanager-help-selected-title",
      }),
      selected: this.props.intl.formatMessage({
        defaultMessage:
          'Click on the button below labelled "Sign selected documents" to sign this document',
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
          'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign selected documents"',
        id: "docmanager-help-failed-signing",
      }),
      "signed-title": this.props.intl.formatMessage({
        defaultMessage: "Document signed",
        id: "docmanager-help-signed-title",
      }),
      signed: this.props.intl.formatMessage({
        defaultMessage:
          "You have successfully signed the document. Note that if you reload the app you will not have access to the document anymore. The inviter has been notified of your signature, it is up to them to decide if the system should send you the final signed version.",
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
      "failed-loa-title": this.props.intl.formatMessage({
        defaultMessage: "Insufficient security level",
        id: "docmanager-help-failed-loa-title",
      }),
      "failed-loa": this.props.intl.formatMessage({
        defaultMessage:
          "Your account does not provide the required security level. Please take the steps to provide it.",
        id: "docmanager-help-failed-loa-invited",
      }),
    };
    return msgs[msg];
  }
  render() {
    const doc = this.props.doc;
    const invitedBy = (
      <div className={"doc-container-info-row-" + this.props.size}>
        <span className="info-row-label">
          <FormattedMessage defaultMessage="Invited by:" key="invited-by" />
        </span>
        <span className="info-row-items">
          <span className="info-row-item">
            {doc.owner.name} &lt;{doc.owner.email}&gt;.
          </span>
        </span>
      </div>
    );
    const pending = (
      <div className={"doc-container-info-row-" + this.props.size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Waiting for signatures by:"
            key="multisign-owned-waiting"
          />
        </span>
        <span className="info-row-items">
          {doc.pending.map((invite, index) => {
            return (
              <span className="info-row-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;{" "}
                {index < doc.pending.length - 1 ? "," : "."}
              </span>
            );
          })}
        </span>
      </div>
    );
    const signed = (
      <div className={"doc-container-info-row-" + this.props.size}>
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
    const declined = (
      <div className={"doc-container-info-row-" + this.props.size}>
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Declined to sign by:"
            key="multisign-owned-declined"
          />
        </span>
        <span className="info-row-items">
          {doc.declined.map((invite, index) => {
            return (
              <span className="info-row-item" key={index}>
                {invite.name} &lt;{invite.email}&gt;{" "}
                {index < doc.declined.length - 1 ? "," : "."}
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
    const failedLoA = (doc.state === "failed-loa") && (
      <>
        {widgets.showMessage(doc)}
      </>
    ) || "";
    return (
      <>
        <ESPopover
          helpId={"invited-doc-container-" + doc.key}
          key={doc.key}
          title={this.getHelp(doc.state + "-title")}
          body={this.getHelp(doc.state)}
        >
          {(this.props.size === "lg" && (
            <div
              className={"doc-flex-container invitation-multisign " + doc.state}
              data-testid={`representation-for-doc-${doc.key}`}
            >
              <div className="invitation-multisign-request">
                <div
                  className={"invitation-name-and-buttons-" + this.props.size}
                  id={"invitee-doc-" + doc.key}
                >
                  {doc.state === "unconfirmed" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      <ESDropdown doc={doc}>
                        {menu.downloadDraftMenuItem(this.props, doc)}
                      </ESDropdown>
                      {widgets.forcedPreviewButton(this.props, doc)}
                      {widgets.declineSignatureButton(this.props, doc)}
                    </>
                  )}
                  {["loaded", "selected", "failed-signing"].includes(
                    doc.state,
                  ) && (
                    <>
                      {widgets.selectDoc(this.props, doc)}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.showMessage(doc)}
                      <ESDropdown doc={doc}>
                        {menu.previewMenuItem(this.props, doc)}
                        {menu.downloadDraftMenuItem(this.props, doc)}
                      </ESDropdown>
                      {widgets.declineSignatureButton(this.props, doc)}
                    </>
                  )}
                  {doc.state === "signing" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.namedSpinner(doc.key, "signing")}
                    </>
                  )}
                  {doc.state === "signed" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      {widgets.downloadDraftButton(this.props, doc)}
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
                  {doc.state === "failed-loa" && (
                    <>
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                      <div className="doc-manager-buttons">
                        {widgets.declineSignatureButton(this.props, doc)}
                      </div>
                    </>
                  )}
                </div>
                {failedLoA}
                {invites}
                {preparePrevSigs(doc, this.props.size)}
                {widgets.infoLine(doc, this.props.size)}
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
                    <ESDropdown doc={doc}>
                      {menu.downloadDraftMenuItem(this.props, doc)}
                    </ESDropdown>
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
                    <ESDropdown doc={doc}>
                      {menu.previewMenuItem(this.props, doc)}
                      {menu.downloadDraftMenuItem(this.props, doc)}
                    </ESDropdown>
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
                    {widgets.namedSpinner(doc.key, "signing")}
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
                    {widgets.downloadDraftButton(this.props, doc)}
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
              {doc.state === "failed-loa" && (
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
                    {widgets.declineSignatureButton(this.props, doc)}
                  </div>
                </>
              )}
              {invites}
              {preparePrevSigs(doc, this.props.size)}
              {widgets.infoLine(doc, this.props.size)}
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
