import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import "styles/FastSignature.scss";



class FastSignature extends React.Component {

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
                defaultMessage={`Do you want to sign the document?`}
                key="fast-signature-question"
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="user-info-holder">
              <FormattedMessage
                defaultMessage={`You have just accepted the review of {docName}. Do you want to go ahead and sign it?`}
                key="fast-signature-desc"
                values={{ docName: this.props.doc.name }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <ESTooltip
              helpId="button-close-fast-signature"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Put off signing the document for later"
                  key="close-fast-signature-help"
                />
              }
            >
              <Button
                variant="outline-secondary"
                onClick={this.props.handleClose}
              >
                <FormattedMessage
                  defaultMessage="Later"
                  key="close-fast-signature-label"
                />
              </Button>
            </ESTooltip>
            <ESTooltip
              helpId="button-accept-fast-signature"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Procceed to sign the document already"
                  key="accept-fast-signature-help"
                />
              }
            >
              <Button
                variant="outline-success"
                onClick={this.props.handleSign}
              >
                <FormattedMessage
                  defaultMessage="Sign"
                  key="accept-fast-signature-label"
                />
              </Button>
            </ESTooltip>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

FastSignature.propTypes = {
  show: PropTypes.bool,
};

export default injectIntl(FastSignature);
