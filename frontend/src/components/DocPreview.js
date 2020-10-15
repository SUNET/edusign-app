import React, { Component, useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf";
import LittleSpinner from "components/LittleSpinner";

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

  // https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
  function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
      return bytes + " B";
    }

    const units = si
      ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
      : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    const r = 10 ** dp;

    do {
      bytes /= thresh;
      ++u;
    } while (
      Math.round(Math.abs(bytes) * r) / r >= thresh &&
      u < units.length - 1
    );

    return bytes.toFixed(dp) + " " + units[u];
  }

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
          <div className="doc-flex-container">
            <div className="name-flex-item">{doc.name}</div>
            <div className="size-flex-item">{humanFileSize(doc.size)}</div>
            <div className="type-flex-item">{doc.type}</div>
            {doc.state === "loading" && (
              <>
                <LittleSpinner index={index} />
                <div className="loading-flex-item">{" loading ..."}</div>
              </>
            )}
            {doc.state === "loaded" && (
              <>
                <div className="button-preview-flex-item">
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={props.handlePreview(index)}
                  >
                    <FormattedMessage
                      defaultMessage="Preview"
                      key="preview-button"
                    />
                  </Button>
                </div>
                <div className="button-download-flex-item">
                  <Button
                    as="a"
                    variant="outline-secondary"
                    size="sm"
                    id={"download-link-" + index}
                  >
                    <FormattedMessage
                      defaultMessage="Download"
                      key="download-button"
                    />
                  </Button>
                </div>
                <div className="button-remove-flex-item">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={props.handleRemove(index)}
                  >
                    <FormattedMessage
                      defaultMessage="Remove"
                      key="remove-button"
                    />
                  </Button>
                </div>
              </>
            )}
            {doc.state === "signing" && (
              <>
                <LittleSpinner index={index} />
                <div className="signing-flex-item">{" signing ..."}</div>
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
