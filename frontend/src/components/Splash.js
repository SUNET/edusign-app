import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDom from "react-dom";
import { Spinner } from "spin.js";

import "../../node_modules/spin.js/spin.css";
import "styles/Splash.scss";

const spinnerOpts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1 / 2, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: "spinner-line-fade-quick", // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: "#000000", // CSS color or array of colors
  fadeColor: "transparent", // CSS color or array of colors
  top: "50%", // Top position relative to parent
  left: "50%", // Left position relative to parent
  shadow: "0 0 1px transparent", // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: "spinner", // The CSS class to assign to the spinner
  position: "absolute", // Element positioning
};

class Splash extends Component {
  componentDidMount() {
    if (this.props.is_app_loading) {
      const splash = document.getElementById("edusign-splash-screen");
      new Spinner(spinnerOpts).spin(splash);
    }
  }

  render() {
    return this.props.is_app_loading ? <div id="edusign-splash-screen" /> : "";
  }
}

Splash.propTypes = {
  is_app_loading: PropTypes.bool,
};

export default Splash;
