import React from "react";
import { injectIntl } from "react-intl";
import Dropdown from "react-bootstrap/Dropdown";

import "styles/Dropdown.scss";


const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
  <div
    className="dropdown-3dots-toggle"
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    <div className="top-circle"/>
    <div className="middle-circle"/>
    <div className="bottom-circle"/>
    {children}
  </div>
));

const CustomMenu = React.forwardRef(
  ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={className}
        aria-labelledby={labeledBy}
      >
        <ul className="list-unstyled">
          {children}
        </ul>
      </div>
    );
  },
);

class ESDropdown extends React.Component {
  render() {
    return (
      <Dropdown>
        <Dropdown.Toggle as={CustomToggle}>
        </Dropdown.Toggle>

        <Dropdown.Menu align="right" as={CustomMenu}>
          {this.props.children}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

export default injectIntl(ESDropdown);
