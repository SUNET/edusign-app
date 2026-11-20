import React from "react";
import DropdownButton from "containers/DropdownButton";
import "styles/Dropdown.scss";
import { useIntl } from "react-intl";

function ESDropdown(props) {
  const intl = useIntl();
  const buttonId = "dropdown-" + (props.doc.key || props.doc.name);
  return (
    <DropdownButton
      title={intl.formatMessage({
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
    >
      {props.children}
    </DropdownButton>
  );
}

export default ESDropdown;
