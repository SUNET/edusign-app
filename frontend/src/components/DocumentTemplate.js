import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { injectIntl } from "init-app/intl";
import { ESPopover } from "containers/Overlay";
import ESDropdown from "components/Dropdown";
import * as menu from "components/dropdownItems";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";
import "styles/DocManager.scss";

/**
 * @desc This component provides a representation of the document templates in the session.
 *
 * @component
 */
function DocumentTemplate(props) {
  const getHelp = (msg) => {
    const msgs = {
      "template-title": props.intl.formatMessage({
        defaultMessage: "Template",
        id: "docmanager-help-template-loaded-title",
      }),
      "template-body": props.intl.formatMessage({
        defaultMessage:
          'To create a copy of this template, click on "invite others to sign"',
        id: "docmanager-help-template-loaded",
      }),
    };
    return msgs[msg];
  };

  const doc = props.doc;
  const signed =
    (doc.state === "signed" && (
      <div className="info-row" key="-1">
        <span className="label">
          <FormattedMessage
            defaultMessage="Signed by:"
            key="multisign-owned-signed"
          />
        </span>
        <span className="item">
          {props.name} &lt;{props.mail}&gt;.
        </span>
      </div>
    )) ||
    "";

  return (
    <ESPopover
      helpId={"template-doc-container-" + doc.name}
      key={doc.name}
      title={getHelp("template-title")}
      body={getHelp("template-body")}
    >
      <div
        className={"doc-flex-container " + doc.state}
        data-testid={`representation-for-doc-${doc.name}`}
        key="0"
      >
        <div className="doc-detail-block">
          <div className="select-column">
            {widgets.dummySelectDoc()}
            {widgets.docName(doc)}
            {widgets.docSize(doc)}
            <div className="buttons-flex">
              <ESDropdown doc={doc}>
                {(doc.has_form && menu.fillFormMenuItem(props, doc)) || ""}
                {menu.previewTemplateMenuItem(props, doc)}
              </ESDropdown>
              {widgets.multiSignButton(props, doc)}
            </div>
            {widgets.removeTemplate(props, doc)}
          </div>
        </div>
        {widgets.docCreated(props)}
        {signed}
        {preparePrevSigs(doc, props.size)}
      </div>
    </ESPopover>
  );
}

DocumentTemplate.propTypes = {
  /**
   * The documents to manage
   */
  documents: PropTypes.array,
  handlePreview: PropTypes.func,
  handleRemove: PropTypes.func,
};

export default injectIntl(DocumentTemplate);
