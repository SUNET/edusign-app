import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import { ESPopover } from "containers/Overlay";

import { docToFile, humanFileSize } from "components/utils";
import DocPreviewContainer from "containers/DocPreview";
import LittleSpinner from "components/LittleSpinner";
import ForcedPreviewContainer from "containers/ForcedPreview";
import DocumentInvited from "components/DocumentInvited";
import DelegateFormContainer from "containers/DelegateForm";
import * as widgets from "components/widgets";
import { preparePrevSigs } from "components/utils";

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
          let docFile = null;
          if (doc.show || doc.showForced) {
            docFile = docToFile(doc);
          }
          return (
            <React.Fragment key={index}>
              <DocumentInvited key="0" doc={doc} {...this.props} />
              {doc.show && (
                <DocPreviewContainer
                  doc={doc}
                  docFile={docFile}
                  handleClose={this.props.handleClosePreview}
                />
              )}
              {doc.state === "unconfirmed" && (
                <ForcedPreviewContainer
                  doc={doc}
                  docFile={docFile}
                  index={doc.name}
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
