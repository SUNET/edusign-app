import React, { Component } from "react";
import PropTypes from "prop-types";
import BButton from "react-bootstrap/Button";
import { Spinner } from "spin.js";

import "../../node_modules/spin.js/spin.css";
import "styles/Button.scss";

const spinnerOpts = {
  lines: 8, // The number of lines to draw
  length: 5, // The length of each line
  width: 2, // The line thickness
  radius: 2, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: "spinner-line-fade-quick", // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: "#000000", // CSS color or array of colors
  fadeColor: "transparent", // CSS color or array of colors
  shadow: "0 0 1px transparent", // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: "spinner", // The CSS class to assign to the spinner
};

/**
 * @desc Spinner in button
 * @component
 */
class Spin extends Component {
  componentDidMount() {
    const anchor = document.getElementById(this.props.id);
    new Spinner(spinnerOpts).spin(anchor);
  }
  render() {
    return <div className="spinner-button-item" id={this.props.id}></div>;
  }
}

Spin.propTypes = {
  id: PropTypes.string,
};

/**
 * @desc Override react-bootstrap's Button to add a spinner on top
 * @component
 */
class Button extends Component {
  render() {
    const { doHandleClick, disabling, disabled, spinning, onClick, ...props } =
      this.props;
    const isDisabled = disabled || spinning !== "";
    const isSpinning = spinning === this.props.id;
    return (
      <BButton
        className={isSpinning ? "button-with-spinner" : ""}
        data-testid={props.id}
        disabled={isDisabled}
        onClick={doHandleClick.bind(this)}
        {...props}
      >
        {isSpinning && <Spin id={"spinner-" + props.id} />}
        {props.children}
      </BButton>
    );
  }
}

Button.propTypes = {
  id: PropTypes.string,
  disabling: PropTypes.bool,
  disabled: PropTypes.bool,
  spinning: PropTypes.string,
  onClick: PropTypes.func,
};

Button.defaultProps = {
  disabling: false,
  disabled: false,
  spinning: "",
  onClick: async () => {},
};

export default Button;
