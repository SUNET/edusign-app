import React, { Component } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import { FormattedMessage, injectIntl } from "react-intl";

import Button from "containers/Button";

import "styles/ConfirmDialog.scss";

class ConfirmDialog extends Component {
  handleConfirm(props) {
    return async () => {
      await props.confirm();
      props.closeConfirm();
    };
  }

  render() {
    return (
      <div
        id={this.props.confirmId}
        tabIndex="-1"
        role="dialog"
        aria-hidden="true"
        data-backdrop="true"
      >
        <Modal show={this.props.show} onHide={this.props.closeConfirm}>
          <Modal.Header>{this.props.title}</Modal.Header>
          <Modal.Body>
            <div>
              <p>{this.props.mainText}</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="confirm-buttons">
              <Button
                id={this.props.confirmId + "-confirm-button"}
                disabling={true}
                variant="outline-success"
                size="sm"
                onClick={this.handleConfirm(this.props)}
              >
                <FormattedMessage
                  defaultMessage="Confirm"
                  key="confirm-dialog-confirm"
                />
              </Button>
              <Button
                id={this.props.confirmId + "-cancel-button"}
                variant="outline-danger"
                size="sm"
                onClick={this.props.closeConfirm}
              >
                <FormattedMessage
                  defaultMessage="Cancel"
                  key="confirm-dialog-cancel"
                />
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

ConfirmDialog.propTypes = {
  show: PropTypes.bool,
  confirmId: PropTypes.string,
  title: PropTypes.string,
  mainText: PropTypes.string,
  closeConfirm: PropTypes.func,
  confirm: PropTypes.func,
};

export default injectIntl(ConfirmDialog);
