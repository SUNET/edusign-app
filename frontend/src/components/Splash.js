import React, { useEffect, useRef } from "react";
import { Spinner } from "spin.js";
import "../../node_modules/spin.js/spin.css";
import "styles/Splash.scss";
import { useSelector } from "react-redux";

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

/**
 * @desc Splash screen showing a large spinner, shown when the app is loading.
 * @component
 */
function Splash() {
  const isAppLoading = useSelector((state) => state.main.loading);
  const anchor = useRef(null);

  useEffect(() => {
    if (!isAppLoading) return;
    const spinner = new Spinner(spinnerOpts).spin(anchor.current);
    return () => spinner.stop();
  }, [isAppLoading]);

  return (
    isAppLoading && (
      <div
        id="edusign-splash-screen"
        data-testid="edusign-splash-screen"
        ref={anchor}
      />
    )
  );
}

export default Splash;
