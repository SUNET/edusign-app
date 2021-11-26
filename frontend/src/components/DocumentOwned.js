import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";

import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class DocumentOwned extends Component {
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
      "incomplete-title": this.props.intl.formatMessage({
        defaultMessage: "Waiting for invited signatures",
        id: "docmanager-help-incomplete-title",
      }),
      incomplete: this.props.intl.formatMessage({
        defaultMessage:
          "You must wait for all invited people to respond before signing this document yourself.",
        id: "docmanager-help-incomplete",
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
          'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
        id: "docmanager-help-signed",
      }),
    };
    return msgs[msg];
  }
  render() {
    const doc = this.props.doc;
    return (
      <>
        <ESPopover
          key={doc.name}
          title={this.getHelp(doc.state + "-title")}
          body={this.getHelp(doc.state)}
        >
          <div className={"invitation-multisign " + doc.state}>
            <div className="invitation-multisign-request">
              <div className={"invitation-name-and-buttons-" + this.props.size}>
                {doc.state === "incomplete" && (
                  <>
                    {(this.props.size === "lg" && (
                      <>
                        {widgets.dummySelectDoc()}
                        {widgets.docSize(doc)}
                        {widgets.docName(doc)}
                        <div className="owned-container-buttons-lg">
                          <>
                            {widgets.resendButton(this.props, doc)}
                            {widgets.previewButton(this.props, doc)}
                            {widgets.removeConfirmButton(this.props, doc)}
                          </>
                        </div>
                      </>
                    )) || (
                      <>
                        <div className="owned-name-and-buttons">
                          <div className="owned-container-name">
                            <>
                              {widgets.dummySelectDoc()}
                              {widgets.docSize(doc)}
                              {widgets.docName(doc)}
                            </>
                          </div>
                          <div className="owned-container-buttons-sm">
                            <>
                              {widgets.resendButton(this.props, doc)}
                              {widgets.previewButton(this.props, doc)}
                              {widgets.removeConfirmButton(this.props, doc)}
                            </>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {["loaded", "selected", "failed-signing"].includes(
                  doc.state
                ) && (
                  <>
                    {(this.props.size === "lg" && (
                      <>
                        {widgets.selectDoc(this.props, doc)}
                        {widgets.docSize(doc)}
                        {widgets.docName(doc)}
                        {widgets.showMessage(doc)}
                        <div className="owned-container-buttons-lg">
                          <>
                            {widgets.skipSignatureButton(this.props, doc)}
                            {widgets.previewButton(this.props, doc)}
                            {widgets.removeConfirmButton(this.props, doc)}
                          </>
                        </div>
                      </>
                    )) || (
                      <>
                        <div className="owned-name-and-buttons">
                          <div className="owned-container-name">
                            <>
                              {widgets.selectDoc(this.props, doc)}
                              {widgets.docSize(doc)}
                              {widgets.docName(doc)}
                              {widgets.showMessage(doc)}
                            </>
                          </div>
                          <div className="owned-container-buttons-sm">
                            <>
                              {widgets.skipSignatureButton(this.props, doc)}
                              {widgets.previewButton(this.props, doc)}
                              {widgets.removeConfirmButton(this.props, doc)}
                            </>
                          </div>
                        </div>
                      </>
                    )}
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
                    {widgets.removeConfirmButton(
                      this.props,
                      doc,
                      "confirm-remove-signed-owned-" + doc.name
                    )}
                  </>
                )}
              </div>
              {doc.pending.length > 0 && (
                <>
                  <div className="pending-invites">
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
                </>
              )}
              {doc.signed.length > 0 && (
                <>
                  <div className="signed-invites">
                    <span className="signed-invites-label">
                      <FormattedMessage
                        defaultMessage="Signed by:"
                        key="multisign-owned-signed"
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
                </>
              )}
              {doc.declined !== undefined && doc.declined.length > 0 && (
                <>
                  <div className="declined-invites">
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
                </>
              )}
              {preparePrevSigs(doc)}
            </div>
          </div>
        </ESPopover>
      </>
    );
  }
}

DocumentOwned.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(DocumentOwned);
