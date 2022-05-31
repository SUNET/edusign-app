import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropdown from "react-bootstrap/Dropdown";

/**
 * @desc Override react-bootstrap's Dropdown.Item
 * @component
 */
class ESDropdownItem extends Component {
  render() {
    const { doHandleClick, disabling, onClick, ...props } =
      this.props;
    return (
      <Dropdown.Item
        data-testid={props.id}
        parentid={"dropdown-" + props.doc.key || props.doc.name}
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
  parentId: PropTypes.string,
  disabling: PropTypes.bool,
  onClick: PropTypes.func,
};

ESDropdownItem.defaultProps = {
  disabling: false,
  onClick: async () => {},
};

export default ESDropdownItem;
