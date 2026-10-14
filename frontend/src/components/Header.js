import React from "react";
import { FormattedMessage } from "react-intl";
import { injectIntl } from "init-app/intl";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import NotificationsContainer from "containers/Notifications";
import { showUserInfo } from "slices/UserInfo";
import { disablePolling } from "slices/Poll";
import "styles/Header.scss";

/**
 * @desc Header, with the eduSign, the container for notifications to the user,
 *       info on the attributes to be used for signing, and a link to clear the stored documents.
 * @component
 */
function Header() {
  const signer_attributes = useSelector(
    (state) => state.main.signer_attributes,
  );
  const eid_session =
    signer_attributes != null &&
    (signer_attributes.using_bankid || signer_attributes.using_freja);
  const dispatch = useDispatch();

  const handleOpenUserInfo = () => {
    dispatch(disablePolling());
    dispatch(showUserInfo());
  };

  const handleLogout = () => {
    document.location = "logout";
  };

  const userInfoButton = signer_attributes != null && (
    <button type="button" id="user-info-trigger" onClick={handleOpenUserInfo}>
      {signer_attributes.name}
    </button>
  );

  const greeting = eid_session ? (
    <span id="signing-with-span">{userInfoButton}</span>
  ) : (
    <span id="signing-with-span">
      <FormattedMessage defaultMessage="Signed in as " key="signing-with" />
      {userInfoButton}
    </span>
  );

  const logoutButton = eid_session ? (
    ""
  ) : (
    <span id="logout-button-container">
      <Button
        variant="outline-dark"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <FormattedMessage defaultMessage="Logout" key="logout-button" />
      </Button>
    </span>
  );
  const nameInHeader = (
    <div id="name-and-clear-in-header">
      {(signer_attributes != null && (
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
  return (
    <header id="edusign-banner" className="banner" data-testid="edusign-banner">
      <div id="logos-and-name">
        <div id="edusign-logo" data-testid="edusign-logo">
          <img src="/assets/app-logo.png" alt="eduSign" />
        </div>
        <div id="header-right" data-testid="header-right">
          {nameInHeader}
        </div>
      </div>
      <NotificationsContainer />
    </header>
  );
}

export default injectIntl(Header);
