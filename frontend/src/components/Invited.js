import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { docToFile } from "components/utils";
import DocPreviewContainer from "containers/DocPreview";
import LittleSpinner from "components/LittleSpinner";

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

const namedSpinner = (index, name) => {
  return (
    <>
      <LittleSpinner index={index} />
      <div className="spinning-flex-item">{` ${name} ...`}</div>
    </>
  );
}

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
            <div className="invited-multisign" key={index}>
              <div className="invited-multisign-request">
                <div className={"invited-name-and-buttons-" + this.props.size}>
                  <div className="name-flex-item">
                    <span className="invited-doc-name-label">
                      <FormattedMessage
                        defaultMessage="You have been invited to sign"
                        key="invited-doc-name"
                      />
                    </span>
                    <span className="invited-doc-name">{doc.name}</span>
                  </div>
                  <div className="invited-buttons">
                    {(doc.state === 'signing') && (
                      <>
                        {namedSpinner(index, 'signing')}
                      </>
                    ) || (
                      <>
                        {previewButton(
                          this.props,
                          doc,
                          this.getHelp("preview-button-help")
                        )}
                        {signButton(
                          this.props,
                          doc,
                          this.getHelp("sign-button-help")
                        )}
                        {doc.show && (
                          <DocPreviewContainer
                            doc={doc}
                            docFile={docFile}
                            index={doc.key}
                            handleClose={this.props.handleClosePreview}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="invited-by">
                  <span className="invited-by-label">
                    <FormattedMessage
                      defaultMessage="Invited by"
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
