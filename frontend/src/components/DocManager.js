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
  function previewButton(doc) {
    return (
      <>
        <div className="button-preview-flex-item">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handlePreview(doc.name)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </div>
      </>
    );
  }
  function retryButton(doc) {
    return (
      <>
        <div className="button-retry-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleRetry(doc.name)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </div>
      </>
    );
  }
  function selectDoc(doc) {
    return (
      <>
        <input
          type="checkbox"
          onClick={props.handleDocSelection(doc.name)}
          defaultChecked={doc.state === "selected"}
        />
      </>
    );
  }
  function removeButton(doc) {
    return (
      <>
        <div className="button-remove-flex-item">
          <Button
            variant="outline-danger"
            size="sm"
            onClick={props.handleRemove(doc.name)}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </div>
      </>
    );
  }
  function dlSignedButton(doc) {
    return (
      <>
        <div className="button-signed-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.handleDlSigned(doc.name)}
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

  let someSelected = false;

  return (
    <>
      {props.documents.map((doc, index) => {
        if (doc.state === "selected") someSelected = true;
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
            {doc.state === "failed-loading" && <>{removeButton(doc)}</>}
            {doc.state === "failed-preparing" && (
              <>
                {retryButton(doc)}
                {removeButton(doc)}
              </>
            )}
            {(doc.state === "loaded" || doc.state === "selected") && (
              <>
                {selectDoc(doc)}
                {previewButton(doc)}
                {removeButton(doc)}
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
                {previewButton(doc)}
                {dlSignedButton(doc)}
              </>
            )}
            {doc.state === "failed-signing" && (
              <>
                {retryButton(doc)}
                {removeButton(doc)}
              </>
            )}
            <DocPreviewContainer doc={doc} />
          </div>
        );
      })}
      <div className="button-sign-flex-item">
        <Button
          variant="outline-success"
          size="lg"
          disabled={!someSelected}
          onClick={props.handleSubmitToSign}
        >
          <FormattedMessage defaultMessage="Sign" key="sign-button" />
        </Button>
      </div>
      {props.destinationUrl !== undefined && (
        <div>
          <form id="signing-form" action={props.destinationUrl} method="post">
            <input type="hidden" name="Binding" value={props.binding} />
            <input type="hidden" name="RelayState" value={props.relayState} />
            <input
              type="hidden"
              name="EidSignRequest"
              value={props.signRequest}
            />
          </form>
        </div>
      )}
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
