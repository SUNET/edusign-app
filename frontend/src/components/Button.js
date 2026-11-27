import React, { forwardRef, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import BButton from "react-bootstrap/Button";
import BDropdownButton from "react-bootstrap/DropdownButton";
import { Spinner } from "spin.js";
import { setSpinning, unsetSpinning } from "slices/Button";

import "../../node_modules/spin.js/spin.css";
import "styles/Button.scss";
import { useDispatch, useSelector } from "react-redux";

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
function Spin({ id }) {
  const anchor = useRef(null);

  useEffect(() => {
    const spinner = new Spinner(spinnerOpts).spin(anchor.current);
    return () => spinner.stop();
  }, []);

  return <div className="spinner-button-item" id={id} ref={anchor}></div>;
}

Spin.propTypes = {
  id: PropTypes.string,
};

/**
 * @desc Override react-bootstrap's Button to add a spinner on top
 * @component
 */
const Button = forwardRef(function Button(
  { disabling = false, disabled = false, onClick = async () => {}, ...props },
  ref,
) {
  const dispatch = useDispatch();
  const spinning = useSelector((state) => state.button.spinning);

  const handleClick = async (e) => {
    if (disabling) dispatch(setSpinning(props.id));
    try {
      await onClick(e);
    } finally {
      if (disabling) dispatch(unsetSpinning());
    }
  };

  const isDisabled = disabled || spinning !== "";
  const isSpinning = spinning === props.id;
  return (
    <BButton
      ref={ref}
      className={isSpinning ? "button-with-spinner" : ""}
      data-testid={props.id}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {isSpinning && <Spin id={"spinner-" + props.id} />}
      {props.children}
    </BButton>
  );
});

Button.propTypes = {
  id: PropTypes.string,
  disabling: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

Button.defaultProps = {
  disabling: false,
  disabled: false,
  spinning: "",
  onClick: async () => {},
};

export default Button;

/**
 * @desc Override react-bootstrap's DropdownButton to add a spinner on top
 * @component
 */
export function DropdownButton(props) {
  const { disabling, disabled, spinning, dispatch, ...rest } = props;
  const isDisabled = disabled || spinning !== "";
  const isSpinning = spinning === props.id;
  return (
    <BDropdownButton
      className={isSpinning ? "button-with-spinner" : ""}
      data-testid={props.id}
      disabled={isDisabled}
      {...rest}
    >
      {isSpinning && <Spin id={"spinner-" + props.id} />}
      {props.children}
    </BDropdownButton>
  );
}

DropdownButton.propTypes = {
  id: PropTypes.string,
  disabling: PropTypes.bool,
  disabled: PropTypes.bool,
  spinning: PropTypes.string,
};

DropdownButton.defaultProps = {
  disabling: false,
  disabled: false,
  spinning: "",
};
