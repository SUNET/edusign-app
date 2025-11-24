import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import "styles/UserInfo.scss";



class UserInfo extends React.Component {

  render() {
    return (
      <>
        <Modal
          show={this.props.show}
          onHide={this.props.handleClose}
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FormattedMessage
                defaultMessage={`Info for user: {displayName}`}
                key="user-info-modal"
                values={{ displayName: this.props.display_name }}
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="user-info-holder">
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Display name'}
                    key="user-info-display-name"
                  />
                </div>
                <div className="user-attr-value-holder">
                  {this.props.display_name}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <ESTooltip
              helpId="button-close-user-info"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Close User Info Popup"
                  key="close-user-info-help"
                />
              }
            >
              <Button
                variant="outline-secondary"
                onClick={this.props.handleClose}
              >
                <FormattedMessage
                  defaultMessage="Close"
                  key="close-user-info-label"
                />
              </Button>
            </ESTooltip>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

UserInfo.propTypes = {
  show: PropTypes.bool,
};

export default injectIntl(UserInfo);

