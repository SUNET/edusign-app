import React, { Component } from "react";
import PropTypes from "prop-types";
import { Spinner } from "spin.js";

import "../../node_modules/spin.js/spin.css";
import "styles/LittleSpinner.scss";

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
  top: "20%", // Top position relative to parent
  left: "50%", // Left position relative to parent
  shadow: "0 0 1px transparent", // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: "spinner", // The CSS class to assign to the spinner
  position: "absolute", // Element positioning
};

/**
 * @desc a small spinner to indicate the user to wait.
 * @component
 */
class LittleSpinner extends Component {
  componentDidMount() {
    const anchor = document.getElementById(
      "little-spinner-" + this.props.index,
    );
    new Spinner(spinnerOpts).spin(anchor);
  }
  render() {
    const elemId = "little-spinner-" + this.props.index;
    return (
      <div className="spinner-flex-item" id={elemId} data-testid={elemId} />
    );
  }
}

LittleSpinner.propTypes = {
  /**
   * The index of the document holding this spinner
   */
  index: PropTypes.string,
};

export default LittleSpinner;
