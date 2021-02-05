import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";

import "styles/DocPreview.scss";

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
function DocPreview(props) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function changePage(offset) {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <>
      {props.doc.show ? (
        <Modal
          show={true}
          onHide={props.handleClose(props.doc.name)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{props.doc.name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Document
              file={props.docFile}
              onLoadSuccess={onDocumentLoadSuccess}
            >
              <Page pageNumber={pageNumber} width={725} />
            </Document>
          </Modal.Body>

          <Modal.Footer>
            <div className="pdf-navigation">
              <p>
                <FormattedMessage
                  defaultMessage="Page {num} of {total}"
                  key="pdf-preview-page-nav"
                  values={{
                    num: pageNumber || (numPages ? 1 : "--"),
                    total: numPages || "--",
                  }}
                />
              </p>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={Number(pageNumber) <= 1}
                onClick={previousPage}
                data-testid="preview-button-prev"
              >
                <FormattedMessage
                  defaultMessage="Previous"
                  key="pdf-preview-prev-button"
                />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={Number(pageNumber) >= Number(numPages)}
                onClick={nextPage}
                data-testid="preview-button-next"
              >
                <FormattedMessage
                  defaultMessage="Next"
                  key="pdf-preview-next-button"
                />
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={props.handleClose(props.doc.name)}
              data-testid="preview-button-close"
            >
              <FormattedMessage defaultMessage="Close" key="button-close" />
            </Button>
          </Modal.Footer>
        </Modal>
      ) : (
        ""
      )}
    </>
  );
}

DocPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  doc: PropTypes.object,
  docFile: PropTypes.object,
};

export default DocPreview;
