import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tooltip from 'react-bootstrap/Tooltip';
import PopoverContent from 'react-bootstrap/PopoverContent';
import PopoverTitle from 'react-bootstrap/PopoverTitle';
import LittleSpinner from "components/LittleSpinner";

import DocPreviewContainer from "containers/DocPreview";
import InviteFormContainer from "containers/InviteForm";
import OwnedContainer from "containers/Owned";
import InvitedContainer from "containers/Invited";
import { humanFileSize, docToFile } from "components/utils";

import "styles/DocManager.scss";

/**
 * @desc This component provides a representation of the documents in the session.
 *
 * Each document can be in one of several states:
 * - "loading": The document is being loaded from the filesystem.
 * - "failed-loading": PDFjs has not been able to parse the document, irrecoverable failure.
 * - "failed-preparing": There's been som problem sending the document to the backend and API to be prepared, recoverable.
 * - "loaded": The document has been loaded from the fs and is ready to be signed.
 * - "signing": The document is in the process of being signed.
 * - "failed-signing": There's been some problem in the signing process, recoverable failure.
 * - "signed": The document has been signed and is ready to be got by the user.
 *
 * Depending on the state, it will show a different set of controls.
 * @component
 */
function DocManager(props) {
  function docName(doc) {
    return <div className="name-flex-item">{doc.name}</div>;
  }
  function docSize(doc) {
    return <div className="size-flex-item">{humanFileSize(doc.size)}</div>;
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
            onClick={props.handleRetry(doc)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </div>
      </>
    );
  }
  function selectDoc(index, doc) {
    return (
      <>
        <div className="doc-selector-flex-item">
          <input
            type="checkbox"
            data-testid={"doc-selector-" + index}
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
  function getHelp(msg) {
    const msgs = {
      "loading-title": props.intl.formatMessage(
        {
          defaultMessage: "Loading document",
          id: "docmanager-help-loading-title",
        },
      ),
      "loading": props.intl.formatMessage(
        {
          defaultMessage: "Please wait while the document loads",
          id: "docmanager-help-loading",
        },
      ),
      "loaded-title": props.intl.formatMessage(
        {
          defaultMessage: 'Document loaded',
          id: "docmanager-help-loaded",
        },
      ),
      "loaded": props.intl.formatMessage(
        {
          defaultMessage: 'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign Selected Documents"',
          id: "docmanager-help-loaded",
        },
      ),
      "failed-loading-title": props.intl.formatMessage(
        {
          defaultMessage: "Failed loading document",
          id: "docmanager-help-failed-loading-title",
        },
      ),
      "failed-loading": props.intl.formatMessage(
        {
          defaultMessage: "This does not seem to be a valid document",
          id: "docmanager-help-failed-loading",
        },
      ),
      "selected-title": props.intl.formatMessage(
        {
          defaultMessage: 'Document selected for signing',
          id: "docmanager-help-selected-title",
        },
      ),
      "selected": props.intl.formatMessage(
        {
          defaultMessage: 'Click on the button below labelled "Sign Selected Documents" to sign this document',
          id: "docmanager-help-selected",
        },
      ),
      "failed-preparing-title": props.intl.formatMessage(
        {
          defaultMessage: 'Failed preparing document',
          id: "docmanager-help-failed-preparing-title",
        },
      ),
      "failed-preparing": props.intl.formatMessage(
        {
          defaultMessage: 'There was a problem preparing the document for signing, clik on the button labelled "retry" to try again',
          id: "docmanager-help-failed-preparing",
        },
      ),
      "signing-title": props.intl.formatMessage(
        {
          defaultMessage: "Signing document",
          id: "docmanager-help-signing-title",
        },
      ),
      "signing": props.intl.formatMessage(
        {
          defaultMessage: "Please wait while the document is signed",
          id: "docmanager-help-signing",
        },
      ),
      "failed-signing-title": props.intl.formatMessage(
        {
          defaultMessage: 'Failed signing document',
          id: "docmanager-help-failed-signing-title",
        },
      ),
      "failed-signing": props.intl.formatMessage(
        {
          defaultMessage: 'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign Selected Documents"',
          id: "docmanager-help-failed-signing",
        },
      ),
      "signed-title": props.intl.formatMessage(
        {
          defaultMessage: 'Document signed',
          id: "docmanager-help-signed-title",
        },
      ),
      "signed": props.intl.formatMessage(
        {
          defaultMessage: 'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
          id: "docmanager-help-signed",
        },
      ),
    };
    return msgs[msg];
  }

  let someSelected = false;
  let showSignButton = false;

  return (
    <>
      {props.documents.map((doc, index) => {
        if (['loaded', 'selected', 'failed-signing'].includes(doc.state)) {
          showSignButton = true;
        }
        const docFile = docToFile(doc);
        if (docFile === null) {
          doc = {
            ...doc,
            state: "failed-loading",
            message: "XXX Malformed PDF",
          };
        }
        if (doc.state === "selected") someSelected = true;
        if (props.size === "lg") {
          return (
            <OverlayTrigger
              key={index}
              trigger={["hover", "focus"]}
              overlay={
                <Popover placement="auto">
                  <PopoverTitle>
                    {getHelp(doc.state + '-title')}
                  </PopoverTitle>
                  <PopoverContent>
                    {getHelp(doc.state)}
                  </PopoverContent>
                </Popover>
              }>
              <div className={"doc-flex-container " + doc.state} key={index}>
                {doc.state === "loading" && (
                  <>
                    {dummySelectDoc()}
                    {docSize(doc)}
                    {docName(doc)}
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
                    {docSize(doc)}
                    {docName(doc)}
                    {showMessage(doc)}
                    {retryButton(doc)}
                    {removeButton(doc)}
                  </>
                )}
                {(doc.state === "loaded" || doc.state === "selected") && (
                  <>
                    {selectDoc(index, doc)}
                    {docSize(doc)}
                    {docName(doc)}
                    {previewButton(doc)}
                    {removeButton(doc)}
                    <InviteFormContainer docId={doc.id} docName={doc.name} />
                    <DocPreviewContainer doc={doc} docFile={docFile} />
                  </>
                )}
                {doc.state === "signing" && (
                  <>
                    {dummySelectDoc()}
                    {docSize(doc)}
                    {docName(doc)}
                    {namedSpinner(index, "signing")}
                  </>
                )}
                {doc.state === "signed" && (
                  <>
                    {dummySelectDoc()}
                    {docSize(doc)}
                    {docName(doc)}
                    {dlSignedButton(doc)}
                  </>
                )}
                {doc.state === "failed-signing" && (
                  <>
                    {selectDoc(index, doc)}
                    {docSize(doc)}
                    {docName(doc)}
                    {showMessage(doc)}
                    {previewButton(doc)}
                    {removeButton(doc)}
                    <DocPreviewContainer doc={doc} docFile={docFile} />
                  </>
                )}
              </div>
            </OverlayTrigger>
          );
        } else if (props.size === "sm") {
          return (
            <OverlayTrigger
              trigger={["hover", "focus"]}
              key={index}
              overlay={
                <Tooltip placement="auto">
                  {getHelp(doc.state)}
                </Tooltip>
              }>
              <div className={"doc-flex-container-sm " + doc.state}>
                {doc.state === "loading" && (
                  <>
                    <div className="doc-container-first-row">
                      {dummySelectDoc()}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {namedSpinner(index, "loading")}
                    </div>
                  </>
                )}
                {doc.state === "failed-loading" && (
                  <>
                    <div className="doc-container-first-row">
                      {dummySelectDoc()}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {showMessage(doc)}
                    </div>
                    <div className="doc-container-third-row">
                      {removeButton(doc)}
                    </div>
                  </>
                )}
                {doc.state === "failed-preparing" && (
                  <>
                    <div className="doc-container-first-row">
                      {dummySelectDoc()}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {showMessage(doc)}
                    </div>
                    <div className="doc-container-third-row">
                      {retryButton(doc)}
                      {removeButton(doc)}
                    </div>
                  </>
                )}
                {(doc.state === "loaded" || doc.state === "selected") && (
                  <>
                    <div className="doc-container-first-row">
                      {selectDoc(index, doc)}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {previewButton(doc)}
                      {removeButton(doc)}
                      <InviteFormContainer docId={doc.id} docName={doc.name} />
                    </div>
                    <DocPreviewContainer doc={doc} docFile={docFile} />
                  </>
                )}
                {doc.state === "signing" && (
                  <>
                    <div className="doc-container-first-row">
                      {dummySelectDoc()}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {namedSpinner(index, "signing")}
                    </div>
                  </>
                )}
                {doc.state === "signed" && (
                  <>
                    <div className="doc-container-first-row">
                      {dummySelectDoc()}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {dlSignedButton(doc)}
                    </div>
                  </>
                )}
                {doc.state === "failed-signing" && (
                  <>
                    <div className="doc-container-first-row">
                      {selectDoc(index, doc)}
                      {docSize(doc)}
                      {docName(doc)}
                    </div>
                    <div className="doc-container-second-row">
                      {showMessage(doc)}
                    </div>
                    <div className="doc-container-third-row">
                      {previewButton(doc)}
                      {removeButton(doc)}
                    </div>
                    <DocPreviewContainer doc={doc} docFile={docFile} />
                  </>
                )}
              </div>
            </OverlayTrigger>
          );
        }
      })}
      <div id="adjust-vertical-space" />
      {showSignButton && (
        <div className="button-sign-flex-item">
          <Button
            variant="outline-success"
            id="button-sign"
            size="lg"
            disabled={!someSelected}
            onClick={props.handleSubmitToSign}
          >
            <FormattedMessage
              defaultMessage="Sign Selected Documents"
              key="sign-selected-button"
            />
          </Button>
        </div>
      ) || (
        <div className={'dummy-button-sign-flex-item-' + props.size} />
      )}
      <div className="multisign-container">
        <div className="owned-multisign-container">
          <OwnedContainer />
        </div>
        <div className="invited-multisign-container">
          <InvitedContainer />
        </div>
      </div>
      {props.destinationUrl !== undefined &&
        props.destinationUrl !== "https://dummy.destination.url" && (
          <div>
            <form
              id="signing-form"
              data-testid="signing-form"
              action={props.destinationUrl}
              method="post"
            >
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
      {props.destinationUrl === "https://dummy.destination.url" && (
        <div>
          <form
            id="signing-form"
            data-testid="signing-form"
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Mock submitting signing form");
              return false;
            }}
          />
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

export default injectIntl(DocManager);
