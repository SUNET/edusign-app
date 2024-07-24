import React from "react";
import { injectIntl } from "react-intl";
import DropdownButton from "containers/DropdownButton";

import "styles/Dropdown.scss";

class ESDropdown extends React.Component {
  render() {
    const buttonId = "dropdown-" + this.props.doc.key || this.props.doc.name;
    return (
      <DropdownButton
        title={this.props.intl.formatMessage({
          defaultMessage: "Other options",
          id: "dropdown-title",
        })}
        className="button-dropdown-flex-item"
        variant="outline-dark"
        size="sm"
        align="end"
        disabling={true}
        id={buttonId}
        data-testid={buttonId}
        {...this.props}
      >
        {this.props.children}
      </DropdownButton>
    );
  }
}

export default injectIntl(ESDropdown);
