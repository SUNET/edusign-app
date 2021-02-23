import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import { humanFileSize } from "components/utils";

import "styles/Owned.scss";

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
        {this.props.owned.map((doc) => {
          return (
            <>
              <div className="owned-multisign-request">
                <div className="size-flex-item">{humanFileSize(doc.size)}</div>
                <div className="name-flex-item">{doc.name}</div>
              </div>
              <div className="pending-invites">
                <span className="pending-invites-label">
                  <FormattedMessage defaultMessage="Waiting for signatures by:" key="multisign-owned-waiting" />
                </span>
                {doc.pending.map((invite, index) => {
                  return <span className="pending-invite-item" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                })}
              </div>
              {(doc.signed.length > 0) && (
                <div className="signed-invites">
                  <span className="signed-invites-label">
                    <FormattedMessage defaultMessage="Already signed by:" key="multisign-owned-signed" />
                  </span>
                  {doc.signed.map((invite, index) => {
                    return <span className="signed-invite" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                  })}
                </div>
              )}
            </>
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
