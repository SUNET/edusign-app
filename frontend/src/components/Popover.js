import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";
import BPopover from "react-bootstrap/Popover";
import PopoverBody from "react-bootstrap/PopoverBody";
import PopoverHeader from "react-bootstrap/PopoverHeader";

/**
 * @desc Overlay trigger with popover
 * to be able to disable all overlays at once
 * @component
 */
class Popover extends Component {
  render() {
    const {
      title,
      body,
      showHelp,
      dispatch,
      handleToggleOverlay,
      helpId,
      inModal,
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
          <BPopover placement="auto" className={klass} {...props}>
            <PopoverHeader>{title}</PopoverHeader>
            <PopoverBody>{body}</PopoverBody>
          </BPopover>
        }
      />
    );
  }
}

Popover.propTypes = {
  showHelp: PropTypes.bool,
  title: PropTypes.string,
  body: PropTypes.string,
  inModal: PropTypes.bool,
};

Popover.defaultProps = {
  inModal: false,
};

export default Popover;
