import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";

import { docToFile } from "components/utils";

import "styles/DocPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

const documentOptions = {
  cMapUrl: "/js/cmaps/",
  cMapPacked: true,
  enableXfa: true,
};

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
function DocPreview(props) {
  const docFile = useMemo(() => docToFile(props.doc), [props.doc]);

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
            file={docFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onPassword={(c) => {
              throw new Error("Never password");
            }}
            options={documentOptions}
          >
            {(props.width < 550 && (
              <Page
                pageNumber={pageNumber}
                width={props.width - 20}
                renderInteractiveForms={false}
                renderAnnotationLayer={true}
              />
            )) || (
              <Page
                pageNumber={pageNumber}
                renderInteractiveForms={false}
                renderAnnotationLayer={true}
              />
            )}
          </Document>
        </Modal.Body>

        <Modal.Footer>
          <div className="pdf-navigation">
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={firstPage}
              data-testid={"preview-button-first-" + props.doc.name}
            >
              &#x23EA;
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={previousPage}
              data-testid={"preview-button-prev-" + props.doc.name}
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
              data-testid={"preview-button-next-" + props.doc.name}
            >
              &#x25BA;
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) >= Number(numPages)}
              onClick={lastPage}
              data-testid={"preview-button-last-" + props.doc.name}
            >
              &#x23E9;
            </Button>
          </div>
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

DocPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  doc: PropTypes.object,
};

export default DocPreview;
