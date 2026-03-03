import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import BButton from "react-bootstrap/Button";
import Button from "containers/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";
import { ESTooltip } from "containers/Overlay";

import Pagination from "components/Pagination";
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
function ForcedPreview(props) {
  const docFile = useMemo(() => docToFile(props.doc), [props.doc]);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  function onDocumentLoadSuccess({ numPages }) {
    if (numPages === 1) setReadyToConfirm(true);
    setNumPages(numPages);
  }

  function changePage(offset) {
    const newPage = pageNumber + offset;
    setPageNumber(newPage);
    if (newPage === numPages) setReadyToConfirm(true);
  }

  function firstPage() {
    setPageNumber(1);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function lastPage() {
    setReadyToConfirm(true);
    setPageNumber(numPages);
  }

  let rejectButtonLabel = (
    <FormattedMessage
      defaultMessage="Reject"
      key="button-dissaprove"
    />
  );
  let rejectButtonHelpText = (
    <FormattedMessage
      defaultMessage="Click here to reject/remove the document"
      key="dissaprove-doc-tootip"
    />
  );
  let acceptButtonLabel = (
    <FormattedMessage
      defaultMessage="Approve"
      key="button-confirm"
    />
  );
  let acceptButtonHelpText = (
    <FormattedMessage
      defaultMessage="Once you have scrolled to the end of the document you will be able to approve the document for signing"
      key="disabled-confirm-doc-tootip"
    />
  );
  if (readyToConfirm) {
    acceptButtonHelpText = (
      <FormattedMessage
        defaultMessage="Click here to approve the document for signing"
        key="confirm-doc-tootip"
      />
    );
  }
  if (props.using_bankid) {
    rejectButtonLabel = (
      <FormattedMessage
        defaultMessage="Decline"
        key="button-dissaprove-bankid"
      />
    );
    rejectButtonHelpText = (
      <FormattedMessage
        defaultMessage="Click here to reject signing the document"
        key="dissaprove-doc-tootip-bankid"
      />
    );
    acceptButtonLabel = (
      <FormattedMessage
        defaultMessage="Approve"
        key="button-confirm-bankid"
      />
    );
    acceptButtonHelpText = (
      <FormattedMessage
        defaultMessage="Once you have scrolled to the end of the document you will be able to approve the document for signing"
        key="disabled-confirm-doc-tootip-bankid"
      />
    );
    if (readyToConfirm) {
      acceptButtonHelpText = (
        <FormattedMessage
          defaultMessage="Click here to approve and sign the document"
          key="confirm-doc-tootip-bankid"
        />
      );
    }
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
            <Pagination
              numPages={numPages}
              pageNumber={pageNumber}
              firstPage={firstPage}
              previousPage={previousPage}
              nextPage={nextPage}
              lastPage={lastPage}
              index={props.index}
            />
          </div>
          <ESTooltip
            helpId={"preview-button-dissaprove-" + props.index}
            inModal={true}
            tooltip={rejectButtonHelpText}
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
              {rejectButtonLabel}
            </Button>
          </ESTooltip>
          <ESTooltip
            helpId={"preview-button-confirm-" + props.index}
            inModal={true}
            tooltip={acceptButtonHelpText}
          >
            <span className="d-inline-block">
              <Button
                disabled={!readyToConfirm}
                onClick={props.handleConfirm(props.doc)}
                style={(!readyToConfirm && { pointerEvents: "none" }) || {}}
                variant="outline-success"
                id={"preview-button-confirm-" + props.index}
              >
                {acceptButtonLabel}
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
  index: PropTypes.number,
};

export default injectIntl(ForcedPreview);
