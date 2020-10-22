import React, { Component } from "react";
import PropTypes from "prop-types";
import Alert from "react-bootstrap/Alert";

import "styles/Notifications.scss";

/**
 * @desc Area for notifications to the user.
 *
 * Notifications to be shown are added to the system via the notifications/addNotification Redux action.
 * @component
 */
class Notifications extends Component {
  render() {
    let notification = "";
    if (Object.keys(this.props.notification).length !== 0) {
      notification = (
        <Alert
          variant={this.props.notification.level}
          dismissible={true}
          onClose={this.props.handleRMNotification}
        >
          {this.props.notification.message}
        </Alert>
      );
    }
    return (
      <div
        className="notifications-area"
        data-testid="edusign-notifications-area"
      >
        {notification}
      </div>
    );
  }
}

Notifications.propTypes = {
  /**
   * Notification to show
   */
  notification: PropTypes.object,
  handleRMNotification: PropTypes.func,
};

export default Notifications;
