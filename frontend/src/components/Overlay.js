import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";

/**
 * @desc Splash screen showing a large spinner, shown when the app is loading.
 * @component
 */
class OverlayTrigger extends Component {
  render() {
    return (
      <BOverlayTrigger
        {...this.props}
          show={this.props.showHelp ? undefined : false}
      />
    );
  }
}

OverlayTrigger.propTypes = {
  showHelp: PropTypes.bool,
};

export default OverlayTrigger;

