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
            <span id="signer-attributes">
              {this.props.signer_attributes.map((attr) => {
                return (
                  <span className="signer-attribute">
                    <span className="attr-name">{attr.name}: </span>
                    <span className="attr-value">{attr.value}</span>
                  </span>
                );
              })}
            </span>
          </span>
          <span id="sep-in-header">|</span>
          <span id="clear-in-header" onClick={this.props.clearDb}>
            <FormattedMessage defaultMessage="Clear session" key="clear-session" />
          </span>
        </div>
      );
    }
    let banner = undefined;
    if (this.props.size === 'lg') {
      banner = (
        <section id="edusign-banner-lg" className="banner-lg" data-testid="edusign-banner-lg">
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
    } else if (this.props.size === 'sm') {
      banner = (
        <section id="edusign-banner-sm" className="banner-sm" data-testid="edusign-banner-sm">
          <div id="edusign-logos" data-testid="edusign-logos">
            <div id="edusign-logo" data-testid="edusign-logo" />
            <a href="https://sunet.se">
              <div id="sunet-logo" data-testid="sunet-logo" />
            </a>
          </div>
          <NotificationsContainer />
          {name}
        </section>
      );
    }
    return (
      <>
        {banner}
      </>
    );
  }
}

Header.propTypes = {
  /**
   * The attributes used for signing the docs
   */
  signer_attributes: PropTypes.array,
  /**
   * Size of the window: lg | sm
   */
  size: PropTypes.string,
  /**
   * Whether the app has finished loading in the browser
   */
  loading: PropTypes.bool,
  clearDb: PropTypes.func,
};

export default Header;
