import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import "styles/Invited.scss";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Invited extends Component {
  render() {
    if (this.props.invited.length === 0) return '';
    return (
      <>
        <div className="multisign-title">
          <FormattedMessage defaultMessage="Invitations to sign:" key="invitations-to-sign" />
        </div>
        {this.props.invited.map((doc, index) => {
          return (
            <div className="invited-multisign-request" key={index} onClick={this.props.startMultiSigning(doc.invite_key)}>
              <div className="name-flex-item">{doc.name}</div>
              <div className="invited-flex-item">
                <div className="invited-flex-label">
                  <FormattedMessage defaultMessage="Invited by" key="invited-by" />
                </div>
                <div className="owner-flex-item">{doc.owner.name} &lt;{doc.owner.email}&gt;</div>
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

export default Invited;
