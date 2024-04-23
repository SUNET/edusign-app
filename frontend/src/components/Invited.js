import React, { Component } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import ForcedPreviewContainer from "containers/ForcedPreview";
import ForcedXMLPreviewContainer from "containers/ForcedXMLPreview";
import DocPreviewContainer from "containers/DocPreview";
import XMLPreviewContainer from "containers/XMLPreview";
import DocumentInvited from "components/DocumentInvited";
import DelegateFormContainer from "containers/DelegateForm";

import "styles/Invitation.scss";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Invited extends Component {
  render() {
    if (this.props.invited.length === 0) return "";
    return (
      <>
        {this.props.invited.map((doc, index) => {
          const Preview =
            doc.type === "application/pdf"
              ? DocPreviewContainer
              : XMLPreviewContainer;
          const ForcedPreview =
            doc.type === "application/pdf"
              ? ForcedPreviewContainer
              : ForcedXMLPreviewContainer;
          return (
            <React.Fragment key={index}>
              <DocumentInvited key="0" doc={doc} {...this.props} />
              {doc.show && (
                <Preview
                  doc={doc}
                  handleClose={this.props.handleClosePreview}
                  index={Number(index)}
                />
              )}
              {doc.state === "unconfirmed" && (
                <ForcedPreview
                  doc={doc}
                  index={Number(index)}
                  handleClose={this.props.handleCloseForcedPreview}
                  handleConfirm={this.props.handleConfirmForcedPreview}
                  handleUnConfirm={this.props.handleUnConfirmForcedPreview}
                />
              )}
              {["loaded", "selected"].includes(doc.state) && (
                <DelegateFormContainer
                  doc={doc}
                  index={doc.name}
                  handleClose={this.props.handleCloseDelegateForm}
                  handleSubmit={this.props.handleSubmitDelegateForm}
                />
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  }
}

Invited.propTypes = {
  owned: PropTypes.array,
};

export default injectIntl(Invited);
