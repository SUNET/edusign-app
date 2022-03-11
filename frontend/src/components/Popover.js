import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";
import BPopover from "react-bootstrap/Popover";
import PopoverContent from "react-bootstrap/PopoverContent";
import PopoverTitle from "react-bootstrap/PopoverTitle";

/**
 * @desc Overlay trigger with popover
 * to be able to disable all overlays at once
 * @component
 */
class Popover extends Component {
  render() {
    const { title, body, showHelp, dispatch, handleToggleOverlay, helpId, ...props } = this.props;
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={showHelp}
        onToggle={handleToggleOverlay(helpId)}
        overlay={
          <BPopover placement="auto" {...props}>
            <PopoverTitle>{title}</PopoverTitle>
            <PopoverContent>{body}</PopoverContent>
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
};

export default Popover;
