import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

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

/**
 * @desc Overlay trigger with tooltip
 * to be able to disable all overlays at once
 * @component
 */
export class ESTooltip extends Component {
  render() {
    const { tooltip, ...props } = this.props;
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={props.showHelp ? undefined : false}
        overlay={<Tooltip placement="auto">{tooltip}</Tooltip>}
      />
    );
  }
}

ESTooltip.propTypes = {
  showHelp: PropTypes.bool,
  tooltip: PropTypes.object,
};

export default OverlayTrigger;
