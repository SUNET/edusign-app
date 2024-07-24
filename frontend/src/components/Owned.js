import React, { Component } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import DocPreviewContainer from "containers/DocPreview";
import XMLPreviewContainer from "containers/XMLPreview";
import ReInviteFormContainer from "containers/ReInviteForm";
import ConfirmDialogContainer from "containers/ConfirmDialog";
import DocumentOwned from "components/DocumentOwned";

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
          const Preview =
            doc.type === "application/pdf"
              ? DocPreviewContainer
              : XMLPreviewContainer;
          return (
            <React.Fragment key={index}>
              <DocumentOwned key="0" doc={doc} {...this.props} />
              {doc.show && (
                <Preview
                  doc={doc}
                  key="1"
                  handleClose={this.props.handleClosePreview}
                  index={Number(index)}
                />
              )}
              {doc.state === "incomplete" && (
                <ReInviteFormContainer doc={doc} />
              )}
              <ConfirmDialogContainer
                confirmId={"confirm-remove-" + doc.name}
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
