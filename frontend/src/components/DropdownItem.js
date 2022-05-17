import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropdown from "react-bootstrap/Dropdown";

/**
 * @desc Override react-bootstrap's Dropdown.Item
 * @component
 */
class ESDropdownItem extends Component {
  render() {
    const { doHandleClick, disabling, disabled, disable, onClick, ...props } =
      this.props;
    const isDisabled = disabled || disable !== "";
    return (
      <Dropdown.Item
        data-testid={props.id}
        disabled={isDisabled}
        onClick={doHandleClick.bind(this)}
        {...props}
      >
        {props.children}
      </Dropdown.Item>
    );
  }
}

ESDropdownItem.propTypes = {
  id: PropTypes.string,
  disabling: PropTypes.bool,
  disabled: PropTypes.bool,
  spinning: PropTypes.string,
  onClick: PropTypes.func,
};

ESDropdownItem.defaultProps = {
  disabling: false,
  disabled: false,
  onClick: async () => {},
};

export default ESDropdownItem;
