import React from "react";
import { useIntl } from "react-intl";
import { rmNotification } from "slices/Notifications";
import "styles/Notifications.scss";
import { useAppSelector, useAppDispatch } from "init-app/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

/**
 * @desc Area for notifications to the user.
 *
 * Notifications to be shown are added to the system via the notifications/addNotification Redux action.
 * @component
 */
function Notifications() {
  const message = useAppSelector((state) => state.notifications.message);
  const dispatch = useAppDispatch();
  const intl = useIntl();
  let alertMessage: JSX.Element | null = null;

  const handleRMNotification = () => {
    dispatch(rmNotification());
  };

  if (message !== null) {
    alertMessage = (
      <div className={`notification notification-${message.level}`} role="status" aria-live="polite">
        <div className="notification-content">{message.message}</div>
        <button
          type="button"
          className="notification-close"
          onClick={handleRMNotification}
          aria-label={intl.formatMessage({
            defaultMessage: "Close alert",
            id: "notifications-close-alert",
          })}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    );
  }
  return (
    <div className="notifications-area" data-testid="edusign-notifications-area">
      {alertMessage}
    </div>
  );
}

export default Notifications;
