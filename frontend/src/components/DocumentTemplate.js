import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
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
class DocumentTemplate extends React.Component {
  getHelp(msg) {
    const msgs = {
      "template-title": this.props.intl.formatMessage({
        defaultMessage: "Template",
        id: "docmanager-help-template-loaded-title",
      }),
      "template-body": this.props.intl.formatMessage({
        defaultMessage:
          'To create a copy of this template, click on "invite others to sign"',
        id: "docmanager-help-template-loaded",
      }),
    };
    return msgs[msg];
  }

  render() {
    const doc = this.props.doc;
    const signed =
      (doc.state === "signed" && (
        <div className={"doc-container-info-row-" + this.props.size} key="-1">
          <span className="info-row-label">
            <FormattedMessage
              defaultMessage="Signed by:"
              key="multisign-owned-signed"
            />
          </span>
          <span className="info-row-items">
            <span className="info-row-item">
              {this.props.name} &lt;{this.props.mail}&gt;.
            </span>
          </span>
        </div>
      )) ||
      "";

    return (
      <>
        <ESPopover
          helpId={"template-doc-container-" + doc.name}
          key={doc.name}
          title={this.getHelp("template-title")}
          body={this.getHelp("template-body")}
        >
          {(this.props.size === "lg" && (
            <div
              className={"doc-flex-container-local " + doc.state}
              data-testid={`representation-for-doc-${doc.name}`}
              key="0"
            >
              <div className="doc-flex-container">
                {widgets.dummySelectDoc()}
                {widgets.docSize(doc)}
                {widgets.docName(doc)}
                <div className="doc-manager-buttons">
                  <ESDropdown doc={doc}>
                    {(doc.has_form && menu.fillFormMenuItem(this.props, doc)) ||
                      ""}
                    {menu.previewTemplateMenuItem(this.props, doc)}
                  </ESDropdown>
                  {widgets.multiSignButton(this.props, doc)}
                  {widgets.removeTemplate(this.props, doc)}
                </div>
              </div>
              {widgets.docCreated(this.props)}
              {signed}
              {preparePrevSigs(doc, this.props.size)}
            </div>
          )) || (
            <div className={"doc-flex-container-sm " + doc.state} key="0">
              {(doc.state === "loaded" || doc.state === "selected") && (
                <>
                  <div className="doc-container-md-row">
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                  </div>
                  <div className="doc-container-button-row">
                    <ESDropdown doc={doc}>
                      {(doc.has_form &&
                        menu.fillFormMenuItem(this.props, doc)) ||
                        ""}
                      {menu.previewTemplateMenuItem(this.props, doc)}
                    </ESDropdown>
                    {widgets.multiSignButton(this.props, doc)}
                    {widgets.removeTemplate(this.props, doc)}
                  </div>
                </>
              )}
              {widgets.docCreated(this.props)}
              {signed}
              {preparePrevSigs(doc, this.props.size)}
            </div>
          )}
        </ESPopover>
      </>
    );
  }
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
