import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import NotificationsContainer from "containers/Notifications";
import ConfirmDialogContainer from "containers/ConfirmDialog";

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
      this.props.handleLoad();
      name = (
        <div id="name-and-clear-in-header">
          {(this.props.signer_attributes !== undefined &&
            this.props.signer_attributes.length > 0 && (
              <>
                <span id="name-in-header">
                  <span id="signing-with-span">
                    <FormattedMessage
                      defaultMessage="Signing with: "
                      key="signing-with"
                    />
                  </span>
                  <span id="signer-attributes">
                    {this.props.signer_attributes.map((attr, index) => {
                      return (
                        <span className="signer-attribute" key={index}>
                          <span className="attr-name">{attr.name}: </span>
                          <span className="attr-value">{attr.value}</span>
                        </span>
                      );
                    })}
                  </span>
                </span>
                <span id="sep-in-header">|</span>
                <OverlayTrigger
                  trigger={["hover", "focus"]}
                  rootClose={true}
                  overlay={(props) => (
                    <Tooltip id="tooltip-clear-docs" {...props}>
                      <FormattedMessage
                        defaultMessage="Discard all documents"
                        key="clear-docs-tootip"
                      />
                    </Tooltip>
                  )}
                >
                  <span
                    id="clear-in-header"
                    data-testid="clear-in-header"
                    onClick={this.props.showConfirm("confirm-clear-session")}
                  >
                    <FormattedMessage
                      defaultMessage="Clear session"
                      key="clear-session"
                    />
                  </span>
                </OverlayTrigger>
                <ConfirmDialogContainer
                  confirmId="confirm-clear-session"
                  title={this.props.intl.formatMessage({
                    defaultMessage: "Confirm Clear Session",
                    id: "header-confirm-clear-title",
                  })}
                  mainText={this.props.intl.formatMessage({
                    defaultMessage:
                      'Clicking "Confirm" will remove all documents from your session',
                    id: "header-confirm-clear-text",
                  })}
                  confirm={this.props.clearDb}
                />
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
    } else if (this.props.size === "sm") {
      banner = (
        <section
          id="edusign-banner-sm"
          className="banner-sm"
          data-testid="edusign-banner-sm"
        >
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
    return <>{banner}</>;
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

export default injectIntl(Header);
