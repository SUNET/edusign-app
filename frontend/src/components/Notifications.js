import React from "react";
import Alert from "react-bootstrap/Alert";
import { rmNotification } from "slices/Notifications";
import "styles/Notifications.scss";
import { useSelector, useDispatch } from "react-redux";

/**
 * @desc Area for notifications to the user.
 *
 * Notifications to be shown are added to the system via the notifications/addNotification Redux action.
 * @component
 */
function Notifications() {
  const message = useSelector((state) => state.notifications.message);
  const dispatch = useDispatch();
  let alertMessage = "";

  const handleRMNotification = () => {
    dispatch(rmNotification());
  };

  if (message !== null) {
    alertMessage = (
      <Alert
        variant={message.level}
        dismissible={true}
        onClose={handleRMNotification}
        className="notification"
        role="status"
        aria-live="polite"
      >
        {message.message}
      </Alert>
    );
  }
  return (
    <div
      className="notifications-area"
      data-testid="edusign-notifications-area"
    >
      {alertMessage}
    </div>
  );
}

export default Notifications;
