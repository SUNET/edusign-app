import React, { Component } from "react";
import PropTypes from "prop-types";
import Alert from "react-bootstrap/Alert";

import "styles/Notifications.scss";

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
    return <div className="notifications-area">{notification}</div>;
  }
}

Notifications.propTypes = {
  notification: PropTypes.object,
  handleRMNotification: PropTypes.func,
};

export default Notifications;
