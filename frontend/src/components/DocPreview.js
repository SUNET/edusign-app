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

  function firstPage() {
    setPageNumber((prevPageNumber) => 1);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function lastPage() {
    setPageNumber((prevPageNumber) => numPages);
  }

  return (
    <>
      <Modal
        show={props.doc.show}
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
            onPassword={(c) => {
              throw new Error("Never password");
            }}
          >
            {(props.width < 550 && (
              <Page pageNumber={pageNumber} width={props.width - 20} />
            )) || <Page pageNumber={pageNumber} />}
          </Document>
        </Modal.Body>

        <Modal.Footer>
          <div className="pdf-navigation">
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={firstPage}
              data-testid={"preview-button-first-" + props.index}
            >
              &#x23EA;
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={previousPage}
              data-testid={"preview-button-prev-" + props.index}
            >
              &#x25C4;
            </Button>
            <span>
              &nbsp;
              {(pageNumber || (numPages ? 1 : "--")) +
                " / " +
                (numPages || "--")}
              &nbsp;
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) >= Number(numPages)}
              onClick={nextPage}
              data-testid={"preview-button-next-" + props.index}
            >
              &#x25BA;
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) >= Number(numPages)}
              onClick={lastPage}
              data-testid={"preview-button-last-" + props.index}
            >
              &#x23E9;
            </Button>
          </div>
          <Button
            variant="outline-secondary"
            onClick={props.handleClose(props.doc.name)}
            data-testid={"preview-button-close-" + props.index}
          >
            <FormattedMessage defaultMessage="Close" key="button-close" />
          </Button>
        </Modal.Footer>
      </Modal>
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
  index: PropTypes.number,
};

export default DocPreview;
