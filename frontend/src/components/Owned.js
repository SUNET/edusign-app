import React, { Component } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import DocumentOwned from "components/DocumentOwned";

import "styles/Invitation.scss";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Owned extends Component {
  render() {
    if (this.props.owned.length === 0) return "";
    return (
      <>
        {this.props.owned.map((doc, index) => {
          return (
            <DocumentOwned key={index} doc={doc} {...this.props} />
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
