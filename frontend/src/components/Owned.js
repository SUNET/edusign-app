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
    return (
      <>
        {this.props.owned.map((doc) => {
          return (
            <>
              <div className="owned-multisign-request">
                <div className="size-flex-item">{humanFileSize(doc.size)}</div>
                <div className="name-flex-item">{doc.name}</div>
              </div>
              <div className="pending-invites">
                <span className="pending-invites-label">
                  <FormattedMessage defaultMessage="Pending signatures:" key="preview-button" />
                </span>
                {doc.pending.map((invite, index) => {
                  return <span className="pending-invite-item" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                })}
              </div>
              <div className="signed-invites">
                  {doc.signed.map((invite, index) => {
                    return <span className="signed-invite" key={index}>{invite.name} &lt;{invite.email}&gt;</span>
                  })}
              </div>
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
