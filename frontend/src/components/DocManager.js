import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import LittleSpinner from "components/LittleSpinner";

import DocPreviewContainer from "containers/DocPreview";
import { humanFileSize } from "components/utils";

import "styles/DocManager.scss";

/**
 * @desc This component provides a representation of the documents in the session.
 *
 * Each document can be in one of several states:
 * - "loading": The document is being loaded from the filesystem.
 * - "loaded": The document has been loaded from the fs and is ready to be signed.
 * - "signing": The document is in the process of being signed.
 * - "signed": The document has been signed and is ready to be got by the user.
 *
 * Depending on the state, it will show a different set of controls.
 * @component
 */
function DocManager(props) {
  function previewButton(index, doc) {
    return (
      <>
        <div className="button-preview-flex-item">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handlePreview(index)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </div>
      </>
    );
  }
  function downloadButton(index, doc) {
    return (
      <>
        <div className="button-download-flex-item">
          <Button
            as="a"
            variant="outline-secondary"
            size="sm"
            data-testid={"download-link-" + index}
            href={doc.blob}
            download={doc.name}
          >
            <FormattedMessage defaultMessage="Download" key="download-button" />
          </Button>
        </div>
      </>
    );
  }
  function retryButton(index, doc) {
    return (
      <>
        <div className="button-retry-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleRetry(index)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </div>
      </>
    );
  }
  function signButton(index, doc) {
    if (doc.creation_response === undefined) {
      return "";
    }
    return (
      <>
        <form action={doc.creation_response.destinationUrl} method="post">
          <div>
            <input
              type="hidden"
              name="Binding"
              value={doc.creation_response.binding}
            />
            <input
              type="hidden"
              name="RelayState"
              value={doc.creation_response.relayState}
            />
            <input
              type="hidden"
              name="EidSignRequest"
              value={doc.creation_response.signRequest}
            />
          </div>
          <div className="button-sign-flex-item">
            <Button
              variant="outline-success"
              size="sm"
              type="submit"
              onClick={props.handleSubmitToSign(index)}
            >
              <FormattedMessage defaultMessage="Sign" key="sign-button" />
            </Button>
          </div>
        </form>
      </>
    );
  }
  function removeButton(index, doc) {
    return (
      <>
        <div className="button-remove-flex-item">
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.handleRemove(index)}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </div>
      </>
    );
  }
  function dlSignedButton(index, doc) {
    return (
      <>
        <div className="button-signed-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleDlSigned(index)}
          >
            <FormattedMessage
              defaultMessage="Download (signed)"
              key="signed-button"
            />
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {props.documents.map((doc, index) => {
        return (
          <div className="doc-flex-container" key={index}>
            <div className="name-flex-item">{doc.name}</div>
            <div className="size-flex-item">{humanFileSize(doc.size)}</div>
            <div className="type-flex-item">{doc.type}</div>
            {doc.state === "loading" && (
              <>
                <LittleSpinner index={index} />
                <div className="loading-flex-item">{" loading ..."}</div>
              </>
            )}
            {doc.state === "failed" && (
              <>
                {retryButton(index, doc)}
                {removeButton(index, doc)}
              </>
            )}
            {doc.state === "loaded" && (
              <>
                {previewButton(index, doc)}
                {downloadButton(index, doc)}
                {signButton(index, doc)}
                {removeButton(index, doc)}
              </>
            )}
            {doc.state === "signing" && (
              <>
                <LittleSpinner index={index} />
                <div className="signing-flex-item">{" signing ..."}</div>
              </>
            )}
            {doc.state === "signed" && (
              <>
                {previewButton(index, doc)}
                {downloadButton(index, doc)}
                {dlSignedButton(index, doc)}
              </>
            )}
            <DocPreviewContainer doc={doc} index={index} />
          </div>
        );
      })}
    </>
  );
}

DocManager.propTypes = {
  /**
   * The documents to manage
   */
  documents: PropTypes.array,
  handlePreview: PropTypes.func,
  handleRemove: PropTypes.func,
  handleDlSigned: PropTypes.func,
  handleSubmitToSign: PropTypes.func,
};

export default DocManager;
