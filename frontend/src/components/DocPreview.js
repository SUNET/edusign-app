import React, { Component, useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";

import "styles/DocPreview.scss";

function DocPreview(props) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  // https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
  const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  };

  return (
    <>
      {props.documents.map((doc, index) => {
        let newFile = null;
        if (doc.state !== "loading") {
          const fileContents = b64toBlob(doc.blob.split(",")[1]);
          newFile = new File([fileContents], doc.name, { type: doc.type });
          const reader = new FileReader();
          reader.onload = () => {
            const link = document.getElementById("download-link-" + index);
            link.setAttribute("href", reader.result);
            link.setAttribute("download", doc.name);
          };
          reader.readAsDataURL(newFile);
        }
        return (
          <div>
            <span>{doc.name}</span>&nbsp;|&nbsp;
            <span>{doc.size}</span>&nbsp;|&nbsp;
            <span>{doc.type}</span>&nbsp;|&nbsp;
            {doc.state === "loading" && "loading ..."}
            {doc.state === "loaded" && (
              <>
                <span>
                  <Button onClick={props.handlePreview(index)}>
                    <FormattedMessage
                      defaultMessage="Preview"
                      key="preview-button"
                    />
                  </Button>
                </span>
                <span>
                  <a id={"download-link-" + index}>
                    <FormattedMessage
                      defaultMessage="Download"
                      key="download-button"
                    />
                  </a>
                </span>
                <span>
                  <Button onClick={props.handleRemove(index)}>
                    <FormattedMessage
                      defaultMessage="Remove"
                      key="remove-button"
                    />
                  </Button>
                </span>
              </>
            )}
            {doc.show ? (
              <Modal show={true} onHide={props.handleClose(index)}>
                <Modal.Header closeButton>
                  <Modal.Title>{doc.name}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                  <Document file={newFile}>
                    <Page pageNumber={1} />
                  </Document>
                  <p>
                    Page {pageNumber} of {numPages}
                  </p>
                </Modal.Body>

                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={props.handleClose(index)}
                  >
                    <FormattedMessage
                      defaultMessage="Close"
                      key="button-close"
                    />
                  </Button>
                </Modal.Footer>
              </Modal>
            ) : (
              ""
            )}
          </div>
        );
      })}
    </>
  );
}

DocPreview.propTypes = {};

export default DocPreview;
