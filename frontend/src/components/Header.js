import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { injectIntl } from "init-app/intl";
import Button from "react-bootstrap/Button";
import NotificationsContainer from "containers/Notifications";
import "styles/Header.scss";

/**
 * @desc Header, with the eduSign and SUNET logos, the container for notifications to the user,
 *       info on the attributes to be used for signing, and a link to clear the stored documents.
 * @component
 */
function Header(props) {
  let name = "";
  const userInfoButton = props.signer_attributes !== undefined && (
    <button
      type="button"
      id="user-info-trigger"
      onClick={props.handleOpenUserInfo}
    >
      {props.signer_attributes.name}
    </button>
  );
  const greeting = props.eid_session ? (
    <span id="signing-with-span">{userInfoButton}</span>
  ) : (
    <span id="signing-with-span">
      <FormattedMessage defaultMessage="Signed in as " key="signing-with" />
      {userInfoButton}
    </span>
  );
  const logoutButton = props.eid_session ? (
    ""
  ) : (
    <span id="logout-button-container">
      <Button
        variant="outline-dark"
        onClick={props.handleLogout}
        data-testid="button-logout"
      >
        <FormattedMessage defaultMessage="Logout" key="logout-button" />
      </Button>
    </span>
  );
  if (!props.loading) {
    name = (
      <div id="name-and-clear-in-header">
        {(props.signer_attributes !== undefined && (
          <span id="name-in-header">
            {greeting}
            {logoutButton}
          </span>
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
  return (
    <header id="edusign-banner" className="banner" data-testid="edusign-banner">
      <div id="logos-and-name">
        <div id="edusign-logo" data-testid="edusign-logo">
          <img src="/assets/app-logo.png" alt="eduSign" />
        </div>
        <div id="header-right" data-testid="header-right">
          <a href={props.company_link}>
            <div id="sunet-logo" data-testid="sunet-logo">
              <img src="/assets/company-logo.png" alt="SUNET" />
            </div>
          </a>
          {name}
        </div>
      </div>
      <NotificationsContainer />
    </header>
  );
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
};

export default injectIntl(Header);
