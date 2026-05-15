import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import "styles/UserInfo.scss";



class AL3Warning extends React.Component {

  render() {
    return (
      <>
        <Modal
          show={this.props.show}
          onHide={this.props.handleClose}
          keyboard={false}
          size="lg"
          backdrop="static"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FormattedMessage
                defaultMessage={`WARNING`}
                key="al3-warning-modal"
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
              <div className="al3-warning-holder">
                <div className="al3-warning-text">
                  <FormattedMessage
                    defaultMessage={"You are choosing to send an invitation requiring high assurance. Please keep in mind that many IdP will crash when requested for high assurance, so make sure that all your invitees will be able to fulfil the requirement."}
                    key="al3-warning-text"
                  />
                </div>
              </div>
            </>
          </Modal.Body>
          <Modal.Footer>
            <ESTooltip
              helpId="button-close-al3-warning"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Close Warning"
                  key="close-al3-warning-help"
                />
              }
            >
              <Button
                variant="outline-secondary"
                onClick={this.props.handleClose}
              >
                <FormattedMessage
                  defaultMessage="Close"
                  key="close-al3-warning-label"
                />
              </Button>
            </ESTooltip>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

AL3Warning.propTypes = {
  show: PropTypes.bool,
};

export default injectIntl(AL3Warning);
