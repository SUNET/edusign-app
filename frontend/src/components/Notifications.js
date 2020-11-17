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
    let messages = this.props.messages.map((msg, index) => {
      return (
        <Alert
          key={index}
          variant={msg.level}
          dismissible={true}
          onClose={this.props.handleRMNotification(index)}
        >
          {msg.message}
        </Alert>
      );
    });
    return (
      <div
        className="notifications-area"
        data-testid="edusign-notifications-area"
      >
        {messages}
      </div>
    );
  }
}

Notifications.propTypes = {
  /**
   * Notification to show
   */
  messages: PropTypes.array,
  handleRMNotification: PropTypes.func,
};

export default Notifications;
