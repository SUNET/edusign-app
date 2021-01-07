import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import NotificationsContainer from "containers/Notifications";

import "styles/Header.scss";

/**
 * @desc Header, with the eduSign and SUNET logos and the container for notifications to the user.
 * @component
 */
class Header extends Component {
  render() {
    let name = "";
    if (!this.props.loading) {
      name = (
        <div id="name-and-clear-in-header">
          <span id="name-in-header">
          <span id="signing-with-span">
              <FormattedMessage defaultMessage="Signing with: " key="signing-with" />
          </span>
            {this.props.signer_attributes}
          </span>|
          <span id="clear-in-header" onClick={this.props.clearDb}>
            <FormattedMessage defaultMessage="Clear session" key="clear-session" />
          </span>
        </div>
      );
    }
    return (
      <section id="edusign-banner" className="banner" data-testid="edusign-banner">
        <div id="edusign-logo" data-testid="edusign-logo" />
        <NotificationsContainer />
        <div id="header-right" data-testid="header-right">
          <a href="https://sunet.se">
            <div id="sunet-logo" data-testid="sunet-logo" />
          </a>
          {name}
        </div>
      </section>
    );
  }
}

Header.propTypes = {};

export default Header;
