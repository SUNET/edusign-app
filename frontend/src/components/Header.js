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
            {this.props.givenName} {this.props.surname}
          </span>|
          <span id="clear-in-header">
            <FormattedMessage defaultMessage="Clear session" key="clear-seesion" />
          </span>
        </div>
      );
    }
    return (
      <section className="banner" data-testid="edusign-banner">
        <header id="edusign-header">
          <div id="edusign-logo" data-testid="edusign-logo" />
          <NotificationsContainer />
          <div id="header-right" data-testid="header-right">
            <a href="https://sunet.se">
              <div id="sunet-logo" data-testid="sunet-logo" />
            </a>
            {name}
          </div>
        </header>
      </section>
    );
  }
}

Header.propTypes = {};

export default Header;
