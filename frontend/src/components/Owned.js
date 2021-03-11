import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";

import "styles/Owned.scss";


const removeButton = (props, doc) =>  {
  return (
    <>
      <div className="button-remove-invitation">
        <Button
          variant="outline-danger"
          size="sm"
          onClick={props.handleRemove(doc)}
        >×</Button>
      </div>
    </>
  );
}


const signButton = (props, doc) =>  {
  return (
    <>
      <div className="button-sign-container">
        <div className="button-sign-invitation">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleSign(doc)}
          >
            <FormattedMessage defaultMessage="Add Final Signature" key="final-sign-button" />
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Owned extends Component {
  render() {
    if (this.props.owned.length === 0) return '';
    return (
      <>
        <div className="multisign-title">
          <FormattedMessage defaultMessage="Requests for multiple signatures:" key="multisign-requests" />
        </div>
        {this.props.owned.map((doc, index) => {
          return (
            <div className="owned-multisign" key={index}>
              <div className="owned-multisign-request">
                <div className="name-flex-item">{doc.name}</div>
                {(doc.pending.length > 0) && (
                  <div className="pending-invites">
                    <span className="pending-invites-label">
                      <FormattedMessage defaultMessage="Waiting for signatures by:" key="multisign-owned-waiting" />
                    </span>
                    {doc.pending.map((invite, index) => {
                      return <span className="pending-invite-item" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                    })}
                  </div>
                )}
                {(doc.signed.length > 0) && (
                  <div className="signed-invites">
                    <span className="signed-invites-label">
                      <FormattedMessage defaultMessage="Already signed by:" key="multisign-owned-signed" />
                    </span>
                    {doc.signed.map((invite, index) => {
                      return <span className="signed-invite-item" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                    })}
                  </div>
                )}
                {(doc.pending.length === 0) && signButton(this.props, doc)}
              </div>
              <div className="owned-multisign-remove">
                {removeButton(this.props, doc)}
              </div>
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

export default Owned;
