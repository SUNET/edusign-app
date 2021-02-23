import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import { humanFileSize } from "components/utils";

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
        {this.props.invited.map((doc) => {
          return (
            <>
              <div className="invited-multisign-request">
                <div className="size-flex-item">{humanFileSize(doc.size)}</div>
                <div className="name-flex-item">{doc.name}</div>
                <FormattedMessage defaultMessage="invited by" key="invited-by" />
                <div className="owner-flex-item">{doc.owner.name} &lt;{doc.owner.email}&gt;</div>
              </div>
            </>
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
