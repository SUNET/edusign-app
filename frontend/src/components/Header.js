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
    let name = '';
    if (!this.props.loading) {
      name = (
        <span id="name-in-header">{this.props.givenName} {this.props.surname}</span>
      );
    }
    return (
      <section className="banner" data-testid="edusign-banner">
        <header id="edusign-header">
          <div id="edusign-logo" data-testid="edusign-logo" />
          <div id="header-right" data-testid="header-right">
            {name}
            <div id="sunet-logo" data-testid="sunet-logo" />
          </div>
        </header>
        <NotificationsContainer />
      </section>
    );
  }
}

Header.propTypes = {};

export default Header;
