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
  function docName(doc) {
    return <div className="name-flex-item">{doc.name}</div> ;
  }
  function docSize(doc) {
    return <div className="size-flex-item">{humanFileSize(doc.size)}</div> ;
  }
  function docType(doc) {
    return <div className="type-flex-item">{doc.type}</div> ;
  }
  function namedSpinner(index, name) {
    return (
      <>
        <LittleSpinner index={index} />
        <div className="spinning-flex-item">{` ${name} ...`}</div>
      </>
    );
  }
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
        <div className="doc-selector-flex-item">
          <input
            type="checkbox"
            onClick={props.handleDocSelection(doc.name)}
            defaultChecked={doc.state === "selected"}
          />
        </div>
      </>
    );
  }
  function dummySelectDoc() {
    return (
      <>
        <div className="doc-selector-flex-item" />
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
  function showMessage(doc) {
    return (
      <>
        <div className="message-flex-item">
          <span alt={doc.message}>{doc.message}</span>
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
            {doc.state === "loading" && (
              <>
                {dummySelectDoc()}
                {docName(doc)}
                {docSize(doc)}
                {docType(doc)}
                {namedSpinner(index, "loading")}
              </>
            )}
            {doc.state === "failed-loading" && (
              <>
                {dummySelectDoc()}
                {docName(doc)}
                {showMessage(doc)}
                {removeButton(doc)}
              </>
            )}
            {doc.state === "failed-preparing" && (
              <>
                {dummySelectDoc()}
                {docName(doc)}
                {showMessage(doc)}
                {retryButton(doc)}
                {removeButton(doc)}
              </>
            )}
            {(doc.state === "loaded" || doc.state === "selected") && (
              <>
                {selectDoc(doc)}
                {docName(doc)}
                {docSize(doc)}
                {docType(doc)}
                {previewButton(doc)}
                {removeButton(doc)}
              </>
            )}
            {doc.state === "signing" && (
              <>
                {dummySelectDoc()}
                {docName(doc)}
                {docSize(doc)}
                {docType(doc)}
                {namedSpinner(index, "signing")}
              </>
            )}
            {doc.state === "signed" && (
              <>
                {dummySelectDoc()}
                {docName(doc)}
                {docSize(doc)}
                {docType(doc)}
                {dlSignedButton(doc)}
              </>
            )}
            {doc.state === "failed-signing" && (
              <>
                {selectDoc(doc)}
                {docName(doc)}
                {showMessage(doc)}
                {previewButton(doc)}
                {removeButton(doc)}
              </>
            )}
            <DocPreviewContainer doc={doc} />
          </div>
        );
      })}
      <div id="adjust-vertical-space" />
      <div className="button-sign-flex-item">
        <Button
          variant="outline-success"
          id="button-sign"
          size="lg"
          disabled={!someSelected}
          onClick={props.handleSubmitToSign}
        >
          <FormattedMessage defaultMessage="Sign Selected Documents" key="sign-selected-button" />
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
