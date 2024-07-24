import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import "styles/XMLPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

/**
 * @desc To show a modal dialog with an XML document.
 * @component
 */
function XMLPreview(props) {
  return (
    <>
      <Modal
        show={props.doc.show}
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
          <Button
            variant="outline-secondary"
            onClick={props.handleClose(props.doc.name)}
            data-testid={"preview-button-close-" + props.doc.name}
          >
            <FormattedMessage defaultMessage="Close" key="button-close" />
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

XMLPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  doc: PropTypes.object,
  docFile: PropTypes.object,
  index: PropTypes.number,
};

export default XMLPreview;
