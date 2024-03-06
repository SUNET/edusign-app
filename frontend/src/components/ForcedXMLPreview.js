import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import BButton from "react-bootstrap/Button";
import Button from "containers/Button";
import Modal from "react-bootstrap/Modal";
import { ESTooltip } from "containers/Overlay";

import "styles/XMLPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

/**
 * @desc To show a modal dialog with an XML document.
 * @component
 */
class ForcedXMLPreview extends React.Component {

  render() {
    if (this.props.docFile === null) return "";

    return (
      <>
        <Modal
          show={this.props.doc.showForced}
          onHide={this.props.handleClose(this.props.doc.name)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{this.props.doc.name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <iframe src ={`data:text/xml;charset=utf-8,${encodeURI(props.docFile)}`}>
            </iframe>
          </Modal.Body>

          <Modal.Footer>
            <ESTooltip
              helpId={"preview-button-dissaprove-" + this.props.index}
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Click here to reject/remove the document"
                  key="dissaprove-doc-tootip"
                />
              }
            >
              <Button
                variant="outline-danger"
                disabling={true}
                onClick={this.props.handleUnConfirm({
                  doc: this.props.doc,
                  intl: this.props.intl,
                })}
                id={"preview-button-dissaprove-" + this.props.index}
              >
                <FormattedMessage
                  defaultMessage="Reject"
                  key="button-dissaprove"
                />
              </Button>
            </ESTooltip>
            <ESTooltip
              helpId={"preview-button-confirm-" + this.props.index}
              inModal={true}
              tooltip={
                  <FormattedMessage
                    defaultMessage="Click here to approve the document for signing"
                    key="confirm-doc-tootip"
                  />
              }
            >
              <span className="d-inline-block">
                <Button
                  onClick={this.props.handleConfirm(this.props.doc.name)}
                  variant="outline-success"
                  id={"preview-button-confirm-" + this.props.index}
                >
                  <FormattedMessage
                    defaultMessage="Approve"
                    key="button-confirm"
                  />
                </Button>
              </span>
            </ESTooltip>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

ForcedXMLPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  handleConfirm: PropTypes.func,
  handleUnConfirm: PropTypes.func,
  doc: PropTypes.object,
  docFile: PropTypes.object,
  index: PropTypes.string,
};

export default injectIntl(ForcedXMLPreview);

