import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { docToFile, humanFileSize } from "components/utils";
import DocPreviewContainer from "containers/DocPreview";
import LittleSpinner from "components/LittleSpinner";

import "styles/Invitation.scss";

const selectDoc = (index, doc, props) => {
  return (
    <>
      <div className="invited-doc-selector-flex-item">
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
    };
    return msgs[msg];
  }
  render() {
    if (this.props.invited.length === 0) return "";
    return (
      <>
        {this.props.invited.map((doc, index) => {
          let docFile = null;
          if (doc.show) {
            docFile = docToFile(doc);
          }
          return (
            <div className="invitation-multisign" key={index}>
              <div className="invitation-multisign-request">
                <div
                  className={"invitation-name-and-buttons-" + this.props.size}
                >
                  {doc.state === "unconfirmed" && (
                    <>
                      {dummySelectDoc()}
                      {docSize(doc)}
                      {docName(doc)}
                      {previewButton(
                        this.props,
                        doc,
                        this.getHelp("preview-button-help")
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
