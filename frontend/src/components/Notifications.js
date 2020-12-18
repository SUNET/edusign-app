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
    let message = '';
    if (this.props.message !== null) {
      message = (
        <Alert
          variant={this.props.message.level}
          dismissible={true}
          onClose={this.props.handleRMNotification}
          className="notification"
        >
          {this.props.message.message}
        </Alert>
      );
    }
    return (
      <div
        className="notifications-area"
        data-testid="edusign-notifications-area"
      >
        {message}
      </div>
    );
  }
}

Notifications.propTypes = {
  /**
   * Notification to show
   */
  message: PropTypes.object,
  handleRMNotification: PropTypes.func,
};

export default Notifications;
