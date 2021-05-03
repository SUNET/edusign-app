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
class DocManager extends React.Component {
  constructor(props){
    super(props);
    props.documents.forEach((doc)=> {
      this["invite-form-" + doc.id] = React.createRef();
    });
  }
  docName(doc) {
    return <div className="name-flex-item">{doc.name}</div>;
  }
  docSize(doc) {
    return <div className="size-flex-item">{humanFileSize(doc.size)}</div>;
  }
  namedSpinner(index, name) {
    return (
      <>
        <LittleSpinner index={index} />
        <div className="spinning-flex-item">{` ${name} ...`}</div>
      </>
    );
  }
  previewButton(doc) {
    return (
      <>
        <div className="button-preview-flex-item">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={this.props.handlePreview(doc.name)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </div>
      </>
    );
  }
  retryButton(doc) {
    return (
      <>
        <div className="button-retry-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={this.props.handleRetry(doc)}
          >
            <FormattedMessage defaultMessage="Retry" key="retry-button" />
          </Button>
        </div>
      </>
    );
  }
  selectDoc(index, doc) {
    return (
      <>
        <div className="doc-selector-flex-item">
          <input
            type="checkbox"
            data-testid={"doc-selector-" + index}
            onClick={this.props.handleDocSelection(doc.name)}
            defaultChecked={doc.state === "selected"}
          />
        </div>
      </>
    );
  }
  dummySelectDoc() {
    return (
      <>
        <div className="doc-selector-flex-item" />
      </>
    );
  }
  removeButton(doc) {
    return (
      <>
        <div className="button-remove-flex-item">
          <Button
            variant="outline-danger"
            size="sm"
            onClick={this.props.handleRemove(doc.name)}
          >
            <FormattedMessage defaultMessage="Remove" key="remove-button" />
          </Button>
        </div>
      </>
    );
  }
  dlSignedButton(doc) {
    return (
      <>
        <div className="button-signed-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={this.props.handleDlSigned(doc.name)}
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
  multiSignButton(doc, onClick) {
    return (
      <>
        <div className="button-multisign-flex-item">
          <Button
            variant="outline-success"
            size="sm"
            onClick={onClick}
            data-docid={doc.id}
          >
            <FormattedMessage
              defaultMessage="Multi sign"
              key="multisign-button"
            />
          </Button>
        </div>
      </>
    );
  }
  showMessage(doc) {
    return (
      <>
        <div className="message-flex-item">
          <span alt={doc.message}>{doc.message}</span>
        </div>
      </>
    );
  }
  getHelp(msg) {
    const msgs = {
      "loading-title": this.props.intl.formatMessage(
        {
          defaultMessage: "Loading document",
          id: "docmanager-help-loading-title",
        },
      ),
      "loading": this.props.intl.formatMessage(
        {
          defaultMessage: "Please wait while the document loads",
          id: "docmanager-help-loading",
        },
      ),
      "loaded-title": this.props.intl.formatMessage(
        {
          defaultMessage: 'Document loaded',
          id: "docmanager-help-loaded",
        },
      ),
      "loaded": this.props.intl.formatMessage(
        {
          defaultMessage: 'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign Selected Documents"',
          id: "docmanager-help-loaded",
        },
      ),
      "failed-loading-title": this.props.intl.formatMessage(
        {
          defaultMessage: "Failed loading document",
          id: "docmanager-help-failed-loading-title",
        },
      ),
      "failed-loading": this.props.intl.formatMessage(
        {
          defaultMessage: "This does not seem to be a valid document",
          id: "docmanager-help-failed-loading",
        },
      ),
      "selected-title": this.props.intl.formatMessage(
        {
          defaultMessage: 'Document selected for signing',
          id: "docmanager-help-selected-title",
        },
      ),
      "selected": this.props.intl.formatMessage(
        {
          defaultMessage: 'Click on the button below labelled "Sign Selected Documents" to sign this document',
          id: "docmanager-help-selected",
        },
      ),
      "failed-preparing-title": this.props.intl.formatMessage(
        {
          defaultMessage: 'Failed preparing document',
          id: "docmanager-help-failed-preparing-title",
        },
      ),
      "failed-preparing": this.props.intl.formatMessage(
        {
          defaultMessage: 'There was a problem preparing the document for signing, clik on the button labelled "retry" to try again',
          id: "docmanager-help-failed-preparing",
        },
      ),
      "signing-title": this.props.intl.formatMessage(
        {
          defaultMessage: "Signing document",
          id: "docmanager-help-signing-title",
        },
      ),
      "signing": this.props.intl.formatMessage(
        {
          defaultMessage: "Please wait while the document is signed",
          id: "docmanager-help-signing",
        },
      ),
      "failed-signing-title": this.props.intl.formatMessage(
        {
          defaultMessage: 'Failed signing document',
          id: "docmanager-help-failed-signing-title",
        },
      ),
      "failed-signing": this.props.intl.formatMessage(
        {
          defaultMessage: 'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign Selected Documents"',
          id: "docmanager-help-failed-signing",
        },
      ),
      "signed-title": this.props.intl.formatMessage(
        {
          defaultMessage: 'Document signed',
          id: "docmanager-help-signed-title",
        },
      ),
      "signed": this.props.intl.formatMessage(
        {
          defaultMessage: 'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
          id: "docmanager-help-signed",
        },
      ),
    };
    return msgs[msg];
  }

  render () {
    let someSelected = false;
    let showSignButton = false;
    let inviteForms = new Array();

    return (
      <>
        {this.props.documents.map((doc, index) => {
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
          if (this.props.size === "lg") {
            return (
              <OverlayTrigger
                key={index}
                trigger={["hover", "focus"]}
                overlay={
                  <Popover placement="auto">
                    <PopoverTitle>
                      {this.getHelp(doc.state + '-title')}
                    </PopoverTitle>
                    <PopoverContent>
                      {this.getHelp(doc.state)}
                    </PopoverContent>
                  </Popover>
                }>
                <div className={"doc-flex-container " + doc.state} key={index}>
                  {doc.state === "loading" && (
                    <>
                      {this.dummySelectDoc()}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.namedSpinner(index, "loading")}
                    </>
                  )}
                  {doc.state === "failed-loading" && (
                    <>
                      {this.dummySelectDoc()}
                      {this.docName(doc)}
                      {this.showMessage(doc)}
                      {this.removeButton(doc)}
                    </>
                  )}
                  {doc.state === "failed-preparing" && (
                    <>
                      {this.dummySelectDoc()}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.showMessage(doc)}
                      {this.retryButton(doc)}
                      {this.removeButton(doc)}
                    </>
                  )}
                  {(doc.state === "loaded" || doc.state === "selected") && (
                    <>
                      {this.selectDoc(index, doc)}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.previewButton(doc)}
                      {this.removeButton(doc)}
                      {(() => {
                        inviteForms.push(
                          <InviteFormContainer docId={doc.id} docName={doc.name} ref={this["invite-form-" + doc.id]} key={index} />
                        );
                        return this.multiSignButton(doc, (e) => this["invite-form-" + doc.id].current.handleOpen().bind(this));
                      }).call(null)}
                      <DocPreviewContainer doc={doc} docFile={docFile} />
                    </>
                  )}
                  {doc.state === "signing" && (
                    <>
                      {this.dummySelectDoc()}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.namedSpinner(index, "signing")}
                    </>
                  )}
                  {doc.state === "signed" && (
                    <>
                      {this.dummySelectDoc()}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.dlSignedButton(doc)}
                    </>
                  )}
                  {doc.state === "failed-signing" && (
                    <>
                      {this.selectDoc(index, doc)}
                      {this.docSize(doc)}
                      {this.docName(doc)}
                      {this.showMessage(doc)}
                      {this.previewButton(doc)}
                      {this.removeButton(doc)}
                      <DocPreviewContainer doc={doc} docFile={docFile} />
                    </>
                  )}
                </div>
              </OverlayTrigger>
            );
          } else if (this.props.size === "sm") {
            return (
              <OverlayTrigger
                trigger={["hover", "focus"]}
                key={index}
                overlay={
                  <Tooltip placement="auto">
                    {this.getHelp(doc.state)}
                  </Tooltip>
                }>
                <div className={"doc-flex-container-sm " + doc.state}>
                  {doc.state === "loading" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.dummySelectDoc()}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.namedSpinner(index, "loading")}
                      </div>
                    </>
                  )}
                  {doc.state === "failed-loading" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.dummySelectDoc()}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.showMessage(doc)}
                      </div>
                      <div className="doc-container-third-row">
                        {this.removeButton(doc)}
                      </div>
                    </>
                  )}
                  {doc.state === "failed-preparing" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.dummySelectDoc()}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.showMessage(doc)}
                      </div>
                      <div className="doc-container-third-row">
                        {this.retryButton(doc)}
                        {this.removeButton(doc)}
                      </div>
                    </>
                  )}
                  {(doc.state === "loaded" || doc.state === "selected") && (
                    <>
                      <div className="doc-container-first-row">
                        {this.selectDoc(index, doc)}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.previewButton(doc)}
                        {this.removeButton(doc)}
                        <InviteFormContainer docId={doc.id} docName={doc.name} />
                      </div>
                      <DocPreviewContainer doc={doc} docFile={docFile} />
                    </>
                  )}
                  {doc.state === "signing" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.dummySelectDoc()}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.namedSpinner(index, "signing")}
                      </div>
                    </>
                  )}
                  {doc.state === "signed" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.dummySelectDoc()}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.dlSignedButton(doc)}
                      </div>
                    </>
                  )}
                  {doc.state === "failed-signing" && (
                    <>
                      <div className="doc-container-first-row">
                        {this.selectDoc(index, doc)}
                        {this.docSize(doc)}
                        {this.docName(doc)}
                      </div>
                      <div className="doc-container-second-row">
                        {this.showMessage(doc)}
                      </div>
                      <div className="doc-container-third-row">
                        {this.previewButton(doc)}
                        {this.removeButton(doc)}
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
              onClick={this.props.handleSubmitToSign}
            >
              <FormattedMessage
                defaultMessage="Sign Selected Documents"
                key="sign-selected-button"
              />
            </Button>
          </div>
        ) || (
          <div className={'dummy-button-sign-flex-item-' + this.props.size} />
        )}
        {inviteForms}
        <div className="multisign-container">
          <div className="owned-multisign-container">
            <OwnedContainer />
          </div>
          <div className="invited-multisign-container">
            <InvitedContainer />
          </div>
        </div>
        {this.props.destinationUrl !== undefined &&
          this.props.destinationUrl !== "https://dummy.destination.url" && (
            <div>
              <form
                id="signing-form"
                data-testid="signing-form"
                action={this.props.destinationUrl}
                method="post"
              >
                <input type="hidden" name="Binding" value={this.props.binding} />
                <input type="hidden" name="RelayState" value={this.props.relayState} />
                <input
                  type="hidden"
                  name="EidSignRequest"
                  value={this.props.signRequest}
                />
              </form>
            </div>
          )}
        {this.props.destinationUrl === "https://dummy.destination.url" && (
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
