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
    const {
      tooltip,
      showHelp,
      dispatch,
      handleToggleOverlay,
      helpId,
      inModal,
      children,
      ...props
    } = this.props;
    let klass = "";
    if (inModal) {
      klass = "on-modal";
    }
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={showHelp}
        onToggle={handleToggleOverlay(helpId)}
        overlay={
          <BTooltip placement="auto" className={klass} data-testid={helpId} {...props}>
            {tooltip}
          </BTooltip>
        }
      >
        {children}
      </BOverlayTrigger>
    );
  }
}

Tooltip.propTypes = {
  showHelp: PropTypes.bool,
  tooltip: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  inModal: PropTypes.bool,
};

Tooltip.defaultProps = {
  inModal: false,
};

export default Tooltip;
