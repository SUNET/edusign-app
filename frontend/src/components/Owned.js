import React, { Component } from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import DocPreviewContainer from "containers/DocPreview";
import ReInviteFormContainer from "containers/ReInviteForm";
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
              {(doc.state === 'incomplete') && (
                <ReInviteFormContainer doc={doc} />
              )}
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
