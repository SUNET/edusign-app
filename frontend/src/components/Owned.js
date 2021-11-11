import React, { Component } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import DocPreviewContainer from "containers/DocPreview";
import ReInviteFormContainer from "containers/ReInviteForm";
import ConfirmDialogContainer from "containers/ConfirmDialog";
import DocumentOwned from "components/DocumentOwned";
import { docToFile } from "components/utils";

import "styles/Invitation.scss";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Owned extends Component {
  render() {
    if (this.props.owned.length === 0) return "";
    return (
      <>
        {this.props.owned.map((doc, index) => {
          let docFile = null;
          if (doc.show) {
            docFile = docToFile(doc);
          }
          return (
            <React.Fragment key={index}>
              <DocumentOwned key="0" doc={doc} {...this.props} />
              {doc.show && (
                <DocPreviewContainer
                  doc={doc}
                  docFile={docFile}
                  key="1"
                  handleClose={this.props.handleClosePreview}
                />
              )}
              {doc.state === "incomplete" && (
                <ReInviteFormContainer doc={doc} />
              )}
              <ConfirmDialogContainer
                confirmId={"confirm-remove-owned-" + doc.name}
                title={this.props.intl.formatMessage({
                  defaultMessage: "Confirm Removal of invitation",
                  id: "header-confirm-remove-owned-title",
                })}
                mainText={this.props.intl.formatMessage({
                  defaultMessage:
                    'Clicking "Confirm" will remove all invitations to sign the document',
                  id: "header-confirm-remove-owned-text",
                })}
                confirm={this.props.handleRemove(doc, this.props)}
              />
            </React.Fragment>
          );
        })}
      </>
    );
  }
}

Owned.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Owned);
