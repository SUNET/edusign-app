import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";

import { b64toBlob } from "components/utils";

import "styles/DocPreview.scss";

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

  let newFile = null;
  if (props.doc.state !== "loading") {
    const fileContents = b64toBlob(props.doc.blob.split(",")[1]);
    newFile = new File([fileContents], props.doc.name, {
      type: props.doc.type,
    });
  }

  return (
    <>
      {props.doc.show ? (
        <Modal
          show={true}
          onHide={props.handleClose(props.index)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{props.doc.name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Document file={newFile} onLoadSuccess={onDocumentLoadSuccess}>
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
              onClick={props.handleClose(props.index)}
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
  doc: PropTypes.object,
  index: PropTypes.number,
  handleClose: PropTypes.func,
};

export default DocPreview;
