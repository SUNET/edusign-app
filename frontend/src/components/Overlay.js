import React, { Component } from "react";
import PropTypes from "prop-types";
import BOverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Popover from "react-bootstrap/Popover";
import PopoverContent from "react-bootstrap/PopoverContent";
import PopoverTitle from "react-bootstrap/PopoverTitle";

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
    const { tooltip, showHelp, dispatch, ...props } = this.props;
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={showHelp ? undefined : false}
        overlay={
          <Tooltip placement="auto" {...props}>
            {tooltip}
          </Tooltip>
        }
      />
    );
  }
}

ESTooltip.propTypes = {
  showHelp: PropTypes.bool,
  tooltip: PropTypes.node,
};

/**
 * @desc Overlay trigger with popover
 * to be able to disable all overlays at once
 * @component
 */
export class ESPopover extends Component {
  render() {
    const { title, body, showHelp, dispatch, ...props } = this.props;
    return (
      <BOverlayTrigger
        {...props}
        delay={{ show: DELAY_SHOW_HELP, hide: DELAY_HIDE_HELP }}
        trigger={["hover", "focus"]}
        rootClose={true}
        show={showHelp ? undefined : false}
        overlay={
          <Popover placement="auto" {...props}>
            <PopoverTitle>{title}</PopoverTitle>
            <PopoverContent>{body}</PopoverContent>
          </Popover>
        }
      />
    );
  }
}

ESPopover.propTypes = {
  showHelp: PropTypes.bool,
  title: PropTypes.string,
  body: PropTypes.string,
};

export default OverlayTrigger;
