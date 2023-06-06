import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import BButton from "react-bootstrap/Button";
import Button from "containers/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf/dist/esm/entry.webpack";
import { ESTooltip } from "containers/Overlay";

import "styles/DocPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
class ForcedPreview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      numPages: null,
      pageNumber: 1,
      readyToConfirm: false,
    };
  }

  onDocumentLoadSuccess({ numPages }) {
    if (numPages === 1) this.setState({ readyToConfirm: true });
    this.setState({ numPages: numPages });
  }

  changePage(offset) {
    const newPage = this.state.pageNumber + offset;
    this.setState({ pageNumber: newPage });
    if (newPage === this.state.numPages)
      this.setState({ readyToConfirm: true });
  }

  firstPage() {
    this.setState({ pageNumber: 1 });
  }

  previousPage() {
    this.changePage(-1);
  }

  nextPage() {
    this.changePage(1);
  }

  lastPage() {
    this.setState({ readyToConfirm: true });
    this.setState({ pageNumber: this.state.numPages });
  }

  render() {
    if (this.props.docFile === null) return "";

    return (
      <>
        <Modal
          show={this.props.doc.showForced}
          onHide={this.props.handleClose(this.props.doc.name)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{this.props.doc.name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Document
              file={this.props.docFile}
              onLoadSuccess={this.onDocumentLoadSuccess.bind(this)}
              onPassword={(c) => {
                throw new Error("Never password");
              }}
              options={{
                cMapUrl: "/js/cmaps/",
                cMapPacked: true,
                enableXfa: true,
              }}
            >
              {(this.props.width < 550 && (
                <Page
                  pageNumber={this.state.pageNumber}
                  width={this.props.width - 20}
                  renderInteractiveForms={false}
                  renderAnnotationLayer={true}
                />
              )) || (
                <Page
                  pageNumber={this.state.pageNumber}
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
                disabled={Number(this.state.pageNumber) <= 1}
                onClick={this.firstPage.bind(this)}
                data-testid={"preview-button-first-" + this.props.index}
              >
                &#x23EA;
              </BButton>
              <BButton
                variant="outline"
                size="sm"
                disabled={Number(this.state.pageNumber) <= 1}
                onClick={this.previousPage.bind(this)}
                data-testid={"preview-button-prev-" + this.props.index}
              >
                &#x25C4;
              </BButton>
              <span>
                &nbsp;
                {(this.state.pageNumber || (this.state.numPages ? 1 : "--")) +
                  " / " +
                  (this.state.numPages || "--")}
                &nbsp;
              </span>
              <BButton
                variant="outline"
                size="sm"
                disabled={
                  Number(this.state.pageNumber) >= Number(this.state.numPages)
                }
                onClick={this.nextPage.bind(this)}
                data-testid={"preview-button-next-" + this.props.index}
              >
                &#x25BA;
              </BButton>
              <BButton
                variant="outline"
                size="sm"
                disabled={
                  Number(this.state.pageNumber) >= Number(this.state.numPages)
                }
                onClick={this.lastPage.bind(this)}
                data-testid={"preview-button-last-" + this.props.index}
              >
                &#x23E9;
              </BButton>
            </div>
            <ESTooltip
              helpId={"preview-button-dissaprove-" + this.props.index}
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
                onClick={this.props.handleUnConfirm({
                  doc: this.props.doc,
                  intl: this.props.intl,
                })}
                id={"preview-button-dissaprove-" + this.props.index}
              >
                <FormattedMessage
                  defaultMessage="Reject"
                  key="button-dissaprove"
                />
              </Button>
            </ESTooltip>
            <ESTooltip
              helpId={"preview-button-confirm-" + this.props.index}
              inModal={true}
              tooltip={
                (this.state.readyToConfirm && (
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
                  disabled={!this.state.readyToConfirm}
                  onClick={this.props.handleConfirm(this.props.doc.name)}
                  style={
                    (!this.state.readyToConfirm && { pointerEvents: "none" }) ||
                    {}
                  }
                  variant="outline-success"
                  id={"preview-button-confirm-" + this.props.index}
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
  index: PropTypes.string,
};

export default injectIntl(ForcedPreview);
