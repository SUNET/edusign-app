import React from "react";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { showUserInfo } from "slices/UserInfo";
import { disablePolling } from "slices/Poll";
import { faUser } from "@fortawesome/free-regular-svg-icons";
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

  const logoutButton = eid_session ? (
    <></>
  ) : (
    <Button
      className="rounded-pill logout-button"
      variant="dark"
      onClick={handleLogout}
      data-testid="button-logout"
    >
      <FormattedMessage defaultMessage="Logout" key="logout-button" />
      &nbsp;
      <FontAwesomeIcon icon={faArrowRightFromBracket} />
    </Button>
  );
  const nameInHeader = (
    <div id="name-and-clear-in-header">
      {(signer_attributes != null && (
        <span id="name-in-header">
          <button
            type="button"
            id="user-info-trigger"
            onClick={handleOpenUserInfo}
            aria-label={signer_attributes.name}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>{signer_attributes.name}</span>
          </button>

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
    </header>
  );
}

export default Header;
