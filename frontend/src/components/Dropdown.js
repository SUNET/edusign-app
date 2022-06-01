import React from "react";
import { injectIntl, FormattedMessage } from "react-intl";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "containers/DropdownButton";
import { ESTooltip } from "containers/Overlay";

import "styles/Dropdown.scss";


class ESDropdown extends React.Component {
  render() {
    return (
      <DropdownButton
        title={this.props.intl.formatMessage({
          defaultMessage: "Other options",
          id: "dropdown-title",
        })}
        variant="outline-dark"
        size="sm"
        menuAlign="right"
        disabling={true}
        id={"dropdown-" + this.props.doc.key || this.props.doc.name}
        {...this.props}
      >
          {this.props.children}
      </DropdownButton>
    );
  }
}

export default injectIntl(ESDropdown);
