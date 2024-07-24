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
function ForcedXMLPreview(props) {
  return (
    <>
      <Modal
        show={props.doc.showForced}
        onHide={props.handleClose(props.doc.name)}
        size="lg"
        centered
        dialogClassName="xml-preview-display"
      >
        <Modal.Header closeButton>
          <Modal.Title>{props.doc.name}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div
            dangerouslySetInnerHTML={{ __html: atob(props.doc.pprinted) }}
          ></div>
        </Modal.Body>

        <Modal.Footer>
          <ESTooltip
            helpId={"preview-button-dissaprove-" + props.index}
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
              onClick={props.handleUnConfirm({
                doc: props.doc,
                intl: props.intl,
              })}
              id={"preview-button-dissaprove-" + props.index}
            >
              <FormattedMessage
                defaultMessage="Reject"
                key="button-dissaprove"
              />
            </Button>
          </ESTooltip>
          <ESTooltip
            helpId={"preview-button-confirm-" + props.index}
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
                onClick={props.handleConfirm(props.doc.name)}
                variant="outline-success"
                id={"preview-button-confirm-" + props.index}
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

ForcedXMLPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  handleConfirm: PropTypes.func,
  handleUnConfirm: PropTypes.func,
  doc: PropTypes.object,
  docFile: PropTypes.object,
  index: PropTypes.number,
};

export default injectIntl(ForcedXMLPreview);
