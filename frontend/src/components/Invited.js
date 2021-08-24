import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { docToFile } from "components/utils";
import DocPreviewContainer from "containers/DocPreview";

import "styles/Invited.scss";

const signButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-sign-container">
          <div className="button-sign-invitation">
            <Button
              variant="outline-success"
              size="sm"
              onClick={props.startMultiSigning(doc.invite_key)}
            >
              <FormattedMessage defaultMessage="Sign" key="sign-button" />
            </Button>
          </div>
        </div>
      </OverlayTrigger>
    </>
  );
};

const previewButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={<Tooltip placement="auto">{help}</Tooltip>}
      >
        <div className="button-preview-container">
          <div className="button-preview-invitation">
            <Button
              variant="outline-success"
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
        <div className="multisign-title">
          <FormattedMessage
            defaultMessage="Invitations to sign:"
            key="invitations-to-sign"
          />
        </div>
        <>
          {this.props.invited.map((doc, index) => {
            let docFile = null;
            if (doc.show) {
              docFile = docToFile(doc);
            }
            return (
              <div className="invited-multisign" key={index}>
                <div className="invited-multisign-request" key={index}>
                  <div className="name-flex-item">{doc.name}</div>
                  <div className="invited-flex-item">
                    <div className="invited-flex-label">
                      <FormattedMessage
                        defaultMessage="Invited by"
                        key="invited-by"
                      />
                    </div>
                    <div className="owner-flex-item">
                      {doc.owner.name} &lt;{doc.owner.email}&gt;
                    </div>
                  </div>
                  {signButton(
                    this.props,
                    doc,
                    this.getHelp("sign-button-help")
                  )}
                  {previewButton(
                    this.props,
                    doc,
                    this.getHelp("preview-button-help")
                  )}
                  {doc.show && (
                    <DocPreviewContainer
                      doc={doc}
                      docFile={docFile}
                      index={doc.key}
                      handleClose={this.props.handleClosePreview}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </>
      </>
    );
  }
}

Invited.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Invited);
