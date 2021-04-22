import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import "styles/Owned.scss";

const removeButton = (props, doc) => {
  return (
    <>
      <div className="button-remove-invitation">
        <Button
          variant="outline-danger"
          size="sm"
          onClick={props.handleRemove(doc)}
          data-testid={"rm-invitation-" + doc.name}
        >
          ×
        </Button>
      </div>
    </>
  );
};

const signButton = (props, doc, help) => {
  return (
    <>
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={
          <Tooltip placement="auto">
            {help}
          </Tooltip>
        }>
        <div className="button-sign-container">
          <div className="button-sign-invitation">
            <Button
              variant="outline-success"
              size="sm"
              onClick={props.handleSign(doc)}
            >
              <FormattedMessage
                defaultMessage="Add Final Signature"
                key="final-sign-button"
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
class Owned extends Component {
  getHelp(msg) {
    const msgs = {
      "close-button-help": this.props.intl.formatMessage(
        {
          defaultMessage: "Cancel Request",
          id: "owned-close-button-help",
        },
      ),
      "sign-button-help": this.props.intl.formatMessage(
        {
          defaultMessage: "All requested users have alredy signed the document, click here to add your final signature",
          id: "owned-sign-button-help",
        },
      ),
    };
    return msgs[msg];
  }
  render() {
    if (this.props.owned.length === 0) return "";
    return (
      <>
        <div className="multisign-title">
          <FormattedMessage
            defaultMessage="Requests for multiple signatures:"
            key="multisign-requests"
          />
        </div>
        {this.props.owned.map((doc, index) => {
          return (
            <div className="owned-multisign" key={index}>
              <div className="owned-multisign-request">
                <div className="name-flex-item">{doc.name}</div>
                {doc.pending.length > 0 && (
                  <>
                    <div className="pending-invites-title">
                      <span className="pending-invites-label">
                        <FormattedMessage
                          defaultMessage="Waiting for signatures by:"
                          key="multisign-owned-waiting"
                        />
                      </span>
                    </div>
                    <div className="pending-invites">
                      {doc.pending.map((invite, index) => {
                        return (
                          <span className="pending-invite-item" key={index}>
                            {invite.name} &lt;{invite.email}&gt;
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
                {doc.signed.length > 0 && (
                  <>
                    <div className="signed-invites-title">
                      <span className="signed-invites-label">
                        <FormattedMessage
                          defaultMessage="Already signed by:"
                          key="multisign-owned-signed"
                        />
                      </span>
                    </div>
                    <div className="signed-invites">
                      {doc.signed.map((invite, index) => {
                        return (
                          <span className="signed-invite-item" key={index}>
                            {invite.name} &lt;{invite.email}&gt;
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
                {doc.pending.length === 0 && signButton(this.props, doc, this.getHelp('sign-button-help'))}
              </div>
            <OverlayTrigger
              trigger={["hover", "focus"]}
              overlay={
                <Tooltip placement="auto">
                  {this.getHelp('close-button-help')}
                </Tooltip>
              }>
                <div className="owned-multisign-remove">
                  {removeButton(this.props, doc)}
                </div>
            </OverlayTrigger>
            </div>
          );
        })}
      </>
    );
  }
}

Owned.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Owned);
