import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "containers/Overlay";
import Tooltip from "react-bootstrap/Tooltip";
import Popover from "react-bootstrap/Popover";
import PopoverContent from "react-bootstrap/PopoverContent";
import PopoverTitle from "react-bootstrap/PopoverTitle";

import { docToFile, humanFileSize } from "components/utils";
import DocPreviewContainer from "containers/DocPreview";
import LittleSpinner from "components/LittleSpinner";
import ForcedPreviewContainer from "containers/ForcedPreview";

import "styles/Invitation.scss";

const selectDoc = (index, doc, props) => {
  return (
    <>
      <div className="doc-selector-flex-item">
        <OverlayTrigger
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          overlay={(props) => (
            <Tooltip id="tooltip-select-invited-doc" {...props}>
              <FormattedMessage
                defaultMessage="Select the document for signing"
                key="select-doc-tootip"
              />
            </Tooltip>
          )}
        >
          <input
            type="checkbox"
            id={"invited-doc-selector-" + index}
            name={"invited-doc-selector-" + index}
            data-testid={"invited-doc-selector-" + index}
            onChange={props.handleDocSelection(doc.name)}
            checked={doc.state === "selected"}
          />
        </OverlayTrigger>
      </div>
    </>
  );
};
const dummySelectDoc = () => {
  return (
    <>
      <div className="doc-selector-flex-item" />
    </>
  );
};

const docName = (doc) => {
  return <div className="name-flex-item">{doc.name}</div>;
};
const docSize = (doc) => {
  return <div className="size-flex-item">{humanFileSize(doc.size)}</div>;
};

const namedSpinner = (index, name) => {
  return (
    <>
      <LittleSpinner index={index} />
      <div className="spinning-flex-item">{` ${name} ...`}</div>
    </>
  );
};

const previewButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-preview-container">
          <div className="button-preview-invitation">
            <Button
              variant="outline-dark"
              size="sm"
              onClick={props.showPreview(doc.key)}
            >
              <FormattedMessage defaultMessage="Preview" key="preview-button" />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};
const forcedPreviewButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-forced-preview-container">
          <div className="button-forced-preview-invitation">
            <Button
              variant="outline-dark"
              size="sm"
              onClick={props.handleForcedPreview(doc.key)}
            >
              <FormattedMessage
                defaultMessage="Approve document for signature"
                key="forced-preview-button"
              />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Invited extends Component {
  getHelp(msg) {
    const msgs = {
      "sign-button-help": this.props.intl.formatMessage({
        defaultMessage: "Click here to sign the document",
        id: "invited-sign-button-help",
      }),
      "preview-button-help": this.props.intl.formatMessage({
        defaultMessage: "Click here to preview the document",
        id: "invited-preview-button-help",
      }),
      "forced-preview-button-help": this.props.intl.formatMessage({
        defaultMessage: "You need to approve all documents for signature",
        id: "forced-preview-button-tooltip",
      }),
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
          'Click on the button labeled "Approve document for signature" to review the document and confirm that you approve it for signature',
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
          'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
        id: "docmanager-help-signed",
      }),
    };
    return msgs[msg];
  }
  render() {
    if (this.props.invited.length === 0) return "";
    return (
      <>
        {this.props.invited.map((doc, index) => {
          let docFile = null;
          if (doc.show || doc.showForced) {
            docFile = docToFile(doc);
          }
          return (
            <OverlayTrigger
              key={index}
              delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
              trigger={["hover", "focus"]}
              rootClose={true}
              overlay={
                <Popover placement="auto">
                  <PopoverTitle>
                    {this.getHelp(doc.state + "-title")}
                  </PopoverTitle>
                  <PopoverContent>
                    {this.getHelp(doc.state)}
                  </PopoverContent>
                </Popover>
              }
            >
              <div className={"invitation-multisign " + doc.state}>
                <div className="invitation-multisign-request">
                  <div
                    className={"invitation-name-and-buttons-" + this.props.size}
                  >
                    {doc.state === "unconfirmed" && (
                      <>
                        {dummySelectDoc()}
                        {docSize(doc)}
                        {docName(doc)}
                        {forcedPreviewButton(
                          this.props,
                          doc,
                          this.getHelp("forced-preview-button-help")
                        )}
                      </>
                    )}
                    {["loaded", "selected", "failed-signing"].includes(
                      doc.state
                    ) && (
                      <>
                        {selectDoc(index, doc, this.props)}
                        {docSize(doc)}
                        {docName(doc)}
                        {previewButton(
                          this.props,
                          doc,
                          this.getHelp("preview-button-help")
                        )}
                      </>
                    )}
                    {doc.state === "signing" && (
                      <>
                        {dummySelectDoc()}
                        {docSize(doc)}
                        {docName(doc)}
                        {namedSpinner(index, "signing")}
                      </>
                    )}
                    {doc.show && (
                      <DocPreviewContainer
                        doc={doc}
                        docFile={docFile}
                        index={index}
                        handleClose={this.props.handleClosePreview}
                      />
                    )}
                    {doc.state === "unconfirmed" && (
                      <ForcedPreviewContainer
                        doc={doc}
                        docFile={docFile}
                        index={index}
                        handleClose={this.props.handleCloseForcedPreview}
                        handleConfirm={this.props.handleConfirmForcedPreview}
                        handleUnConfirm={this.props.handleUnConfirmForcedPreview}
                      />
                    )}
                  </div>
                  <div className="invited-by">
                    <span className="invited-by-label">
                      <FormattedMessage
                        defaultMessage="Invited by:"
                        key="invited-by"
                      />
                    </span>
                    <span className="owner-item">
                      {doc.owner.name} &lt;{doc.owner.email}&gt;
                    </span>
                  </div>

                  {doc.pending.length > 0 && (
                    <>
                      <div className="pending-invites">
                        <span className="pending-invites-label">
                          <FormattedMessage
                            defaultMessage="Waiting for signatures by:"
                            key="multisign-waiting"
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
                            defaultMessage="Already signed by:"
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
                    </>
                  )}
                </div>
              </div>
            </OverlayTrigger>
          );
        })}
      </>
    );
  }
}

Invited.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Invited);
