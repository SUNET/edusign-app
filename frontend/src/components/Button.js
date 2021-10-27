import React, { Component } from "react";
import PropTypes from "prop-types";
import BButton from "react-bootstrap/Button";

/**
 * @desc Override react-bootstrap's Button to add a spinner on top
 * @component
 */
class Button extends Component {
  render() {
    return (
      <BButton
        {...this.props}
      />
    );
  }
}

Button.propTypes = {
  spin: PropTypes.bool,
};

export default Button;

