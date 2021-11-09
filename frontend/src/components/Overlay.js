import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";

/**
 * @desc Override the overlay trigger from react-bootstrap
  * to be able to disable all overlays at once
 * @component
 */
class OverlayTrigger extends Component {
  render() {
    return (
      <BOverlayTrigger
        {...this.props}
          delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
          trigger={["hover", "focus"]}
          rootClose={true}
          show={this.props.showHelp ? undefined : false}
      />
    );
  }
}

OverlayTrigger.propTypes = {
  showHelp: PropTypes.bool,
};

export default OverlayTrigger;

