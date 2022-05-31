import React from "react";
import { injectIntl, FormattedMessage } from "react-intl";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "containers/Button";
import { ESTooltip } from "containers/Overlay";

import "styles/Dropdown.scss";


const CustomToggle = React.forwardRef(({ children, onClick, doc }, ref) => (
      <Button
  as="a"
    ref={ref}
        variant="outline-dark"
        size="sm"
        id={"button-more-options-" + doc.key}
        disabling={true}
        onClick={(e) => {
          e.preventDefault();
          onClick(e);
        }}
      >
        <FormattedMessage
          defaultMessage="More options"
          key="more-options-button"
        />
    {children}
      </Button>
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
        <ESTooltip
          helpId={"doc-more-options-" + this.props.doc.name}
          tooltip={
            <FormattedMessage
              defaultMessage="Click here for a dropdown with more options"
              key="more-options-tootip"
            />
          }
        >
        <Dropdown.Toggle doc={this.props.doc} as={CustomToggle}>
        </Dropdown.Toggle>
    </ESTooltip>

        <Dropdown.Menu doc={this.props.doc} align="right" as={CustomMenu}>
          {this.props.children}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

export default injectIntl(ESDropdown);
