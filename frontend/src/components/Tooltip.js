import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";
import BTooltip from "react-bootstrap/Tooltip";


/**
 * @desc Overlay trigger with tooltip
 * to be able to disable all overlays at once
 * @component
 */
class Tooltip extends Component {
  render() {
    const { tooltip, showHelp, dispatch, ...props } = this.props;
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={showHelp ? undefined : false}
        overlay={
          <BTooltip placement="auto" {...props}>
            {tooltip}
          </BTooltip>
        }
      />
    );
  }
}

Tooltip.propTypes = {
  showHelp: PropTypes.bool,
  tooltip: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]),
};

export default Tooltip;
