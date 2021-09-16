import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import "styles/DocPreview.scss";

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
function ForcedPreview(props) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [readyToConfirm, setReady] = useState(false);

  function onDocumentLoadSuccess({ numPages }) {
    if (numPages === 1) setReady(true);
    setNumPages(numPages);
  }

  function changePage(offset) {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      if (newPage === numPages) setReady(true);
      return newPage;
    });
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
    setReady(true);
    setPageNumber((prevPageNumber) => numPages);
  }

  return (
    <>
      <Modal
        show={props.doc.showForced}
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
          <OverlayTrigger
            trigger={["hover", "focus"]}
            rootClose={true}
            overlay={(props) => (
              <Tooltip id="tooltip-dissaprove-doc" {...props}>
                <FormattedMessage
                  defaultMessage="Click here to reject/remove the document"
                  key="dissaprove-doc-tootip"
                />
              </Tooltip>
            )}
          >
            <Button
              variant="outline-danger"
              onClick={props.handleUnConfirm(props.doc.name)}
              data-testid={"preview-button-dissaprove-" + props.index}
            >
              <FormattedMessage defaultMessage="Reject" key="button-dissaprove" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            trigger={["hover", "focus"]}
            rootClose={true}
            overlay={(props) => (
              <Tooltip id="tooltip-confirm-doc" {...props}>
                {readyToConfirm && (
                  <FormattedMessage
                    defaultMessage="Click here to approve the document for signing"
                    key="confirm-doc-tootip"
                  />
                ) || (
                  <FormattedMessage
                    defaultMessage="Once you have scrolled to the end of the document you will be able to approve the document for signing"
                    key="disabled-confirm-doc-tootip"
                  />
                )}
              </Tooltip>
            )}
          >
            <span class="d-inline-block">
              <Button
                disabled={!readyToConfirm}
                onClick={props.handleConfirm(props.doc.name)}
                style={!readyToConfirm && { pointerEvents: 'none' } || {}}
                variant="outline-secondary"
                data-testid={"preview-button-confirm-" + props.index}
              >
                <FormattedMessage defaultMessage="Approve" key="button-confirm" />
              </Button>
            </span>
          </OverlayTrigger>
        </Modal.Footer>
      </Modal>
    </>
  );
}

ForcedPreview.propTypes = {
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

export default ForcedPreview;
