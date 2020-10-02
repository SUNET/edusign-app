import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

// import "styles/index.scss";

class Main extends Component {
  render() {
    return (
      <div>
        <span id="main-content">
          <FormattedMessage defaultMessage="Main Component" key="test" />
        </span>
      </div>
    );
  }
}

Main.propTypes = {};

export default Main;
