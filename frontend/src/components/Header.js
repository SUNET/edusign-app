import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import NotificationsContainer from "containers/Notifications";

import "styles/Header.scss";

class Header extends Component {
  render() {
    return (
      <section className="banner" data-testid="edusign-banner">
        <header id="edusign-header">
          <div id="edusign-logo" data-testid="edusign-logo" />
          <div id="sunet-logo" data-testid="sunet-logo" />
        </header>
        <NotificationsContainer />
      </section>
    );
  }
}

Header.propTypes = {};

export default Header;
