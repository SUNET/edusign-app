import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import BButton from "react-bootstrap/Button";
import Button from "containers/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf/dist/esm/entry.webpack";
import { ESTooltip } from "containers/Overlay";
import { preparePDF } from "components/utils";

import "styles/DocPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
function ForcedPreview(props) {
  if (!props.doc.blob) return '';

  const docFile = preparePDF(props.doc);

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
            file={docFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onPassword={(c) => {
              throw new Error("Never password");
            }}
            options={{
              cMapUrl: "/js/cmaps/",
              cMapPacked: true,
              enableXfa: true,
            }}
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
            <BButton
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={firstPage}
              data-testid={"preview-button-first-" + props.index}
            >
              &#x23EA;
            </BButton>
            <BButton
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) <= 1}
              onClick={previousPage}
              data-testid={"preview-button-prev-" + props.index}
            >
              &#x25C4;
            </BButton>
            <span>
              &nbsp;
              {(pageNumber || (numPages ? 1 : "--")) +
                " / " +
                (numPages || "--")}
              &nbsp;
            </span>
            <BButton
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) >= Number(numPages)}
              onClick={nextPage}
              data-testid={"preview-button-next-" + props.index}
            >
              &#x25BA;
            </BButton>
            <BButton
              variant="outline"
              size="sm"
              disabled={Number(pageNumber) >= Number(numPages)}
              onClick={lastPage}
              data-testid={"preview-button-last-" + props.index}
            >
              &#x23E9;
            </BButton>
          </div>
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
              (readyToConfirm && (
                <FormattedMessage
                  defaultMessage="Click here to approve the document for signing"
                  key="confirm-doc-tootip"
                />
              )) || (
                <FormattedMessage
                  defaultMessage="Once you have scrolled to the end of the document you will be able to approve the document for signing"
                  key="disabled-confirm-doc-tootip"
                />
              )
            }
          >
            <span className="d-inline-block">
              <Button
                disabled={!readyToConfirm}
                onClick={props.handleConfirm(props.doc.name)}
                style={(!readyToConfirm && { pointerEvents: "none" }) || {}}
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

ForcedPreview.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  handleConfirm: PropTypes.func,
  handleUnConfirm: PropTypes.func,
  doc: PropTypes.object,
  index: PropTypes.string,
};

export default injectIntl(ForcedPreview);
