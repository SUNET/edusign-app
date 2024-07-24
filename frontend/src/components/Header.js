import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";

import NotificationsContainer from "containers/Notifications";

import "styles/Header.scss";

/**
 * @desc Header, with the eduSign and SUNET logos, the container for notifications to the user,
 *       info on the attributes to be used for signing, and a link to clear the stored documents.
 * @component
 */
class Header extends Component {
  render() {
    let name = "";
    if (!this.props.loading) {
      name = (
        <div id="name-and-clear-in-header">
          {(this.props.signer_attributes !== undefined && (
            <>
              <span id="name-in-header">
                <span id="signing-with-span">
                  <FormattedMessage
                    defaultMessage="Signed in as {name}"
                    key="signing-with"
                    values={{ ...this.props.signer_attributes }}
                  />
                </span>
                <span id="logout-button-container">
                  <Button
                    variant="outline-dark"
                    onClick={this.props.handleLogout}
                    data-testid="button-logout"
                  >
                    <FormattedMessage
                      defaultMessage="Logout"
                      key="logout-button"
                    />
                  </Button>
                </span>
              </span>
            </>
          )) || (
            <span id="name-in-header">
              <span id="signing-with-span">
                <FormattedMessage
                  defaultMessage="You don't seem to be authorized to use this site at this moment"
                  key="header-unauthz-for-site"
                />
              </span>
            </span>
          )}
        </div>
      );
    }
    let banner = undefined;
    if (this.props.size === "lg") {
      banner = (
        <section
          id="edusign-banner-lg"
          className="banner-lg"
          data-testid="edusign-banner-lg"
        >
          <div id="logos-and-name">
            <div id="edusign-logo" data-testid="edusign-logo">
              <img src="/assets/app-logo.png" />
            </div>
            <div id="header-right" data-testid="header-right">
              <a href={this.props.company_link}>
                <div id="sunet-logo" data-testid="sunet-logo">
                  <img src="/assets/company-logo.png" />
                </div>
              </a>
              {name}
            </div>
          </div>
          <NotificationsContainer />
        </section>
      );
    } else if (this.props.size === "sm") {
      banner = (
        <section
          id="edusign-banner-sm"
          className="banner-sm"
          data-testid="edusign-banner-sm"
        >
          <div id="edusign-logos" data-testid="edusign-logos">
            <div id="edusign-logo" data-testid="edusign-logo">
              <img src="/assets/app-logo.png" />
            </div>
            <a href={this.props.company_link}>
              <div id="sunet-logo" data-testid="sunet-logo">
                <img src="/assets/company-logo.png" />
              </div>
            </a>
          </div>
          {name}
          <NotificationsContainer />
        </section>
      );
    }
    return <>{banner}</>;
  }
}

Header.propTypes = {
  /**
   * The attributes used for signing the docs
   */
  signer_attributes: PropTypes.object,
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

export default injectIntl(Header);
