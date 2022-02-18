import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESPopover } from "containers/Overlay";
import { ESTooltip } from "containers/Overlay";

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
        defaultMessage: "Template loaded",
        id: "docmanager-help-template-loaded-title",
      }),
      "template-body": this.props.intl.formatMessage({
        defaultMessage:
          'To sign a copy of this template, click on the button labelled "XXX"',
        id: "docmanager-help-template-loaded",
      }),
    };
    return msgs[msg];
  }

  render() {
    const doc = this.props.doc;
    const signed =
      (doc.state === "signed" && (
        <div className="doc-container-signed-row" key="-1">
          <span className="signed-invites-label">
            <FormattedMessage
              defaultMessage="Signed by:"
              key="multisign-owned-signed"
            />
          </span>
          <span className="signed-invites-items">
            <span className="signed-invite-item">
              {this.props.name} &lt;{this.props.mail}&gt;
            </span>
          </span>
        </div>
      )) ||
      "";

    if (this.props.size === "lg") {
      return (
        <>
          <ESPopover
            key={doc.name}
            title={this.getHelp("template-title")}
            body={this.getHelp("template-body")}
          >
            <div className={"doc-flex-container-local " + doc.state} key="0">
              <div className="doc-flex-container">
                {(doc.state === "loaded" || doc.state === "selected") && (
                  <>
                    {widgets.dummySelectDoc()}
                    {widgets.docSize(doc)}
                    {widgets.docName(doc)}
                    <div className="doc-manager-buttons">
                      {widgets.multiSignButton(this.props, doc)}
                      {widgets.previewButton(this.props, doc)}
                      {widgets.removeButton(this.props, doc)}
                    </div>
                  </>
                )}
              </div>
              {signed}
              {preparePrevSigs(doc)}
            </div>
          </ESPopover>
        </>
      );
    } else if (this.props.size === "sm") {
      return (
        <>
          <ESTooltip key={doc.name} tooltip={this.getHelp(doc.state)}>
            <>
              <div className={"doc-flex-container-sm " + doc.state} key="0">
                {(doc.state === "loaded" || doc.state === "selected") && (
                  <>
                    <div className="doc-container-md-row">
                      {widgets.dummySelectDoc()}
                      {widgets.docSize(doc)}
                      {widgets.docName(doc)}
                    </div>
                    <div className="doc-container-button-row">
                      {widgets.multiSignButton(this.props, doc)}
                      {widgets.previewButton(this.props, doc)}
                      {widgets.removeButton(this.props, doc)}
                    </div>
                  </>
                )}
                {signed}
                {preparePrevSigs(doc)}
              </div>
            </>
          </ESTooltip>
        </>
      );
    }
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
