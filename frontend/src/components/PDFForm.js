import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Document, Page } from "react-pdf/dist/esm/entry.webpack";

import "styles/DocPreview.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
class PDFForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      docRef: React.createRef(),
      numPages: null,
      pageNumber: 1,
      values: {}
    };
  }

  onDocumentLoadSuccess({ numPages }) {
    this.setState({numPages});
  }

  changePage(offset) {
    this.setState({pageNumber: this.state.pageNumber + offset});
  }

  async firstPage() {
    await collectValues();
    this.setState({pageNumber: 1});
    this.restoreValues();
  }

  async previousPage() {
    await this.collectValues();
    this.changePage(-1);
    this.restoreValues();
  }

  async nextPage() {
    await this.collectValues();
    this.changePage(1);
    this.restoreValues();
  }

  async lastPage() {
    await this.collectValues();
    this.setState({pageNumber: this.state.numPages});
    this.restoreValues();
  }

  async collectValues() {
    const pdf = this.state.docRef.current.state.pdf;
    const page = await pdf.getPage(this.state.pageNumber);
    const annotations = await page.getAnnotations();
    const values = {};
    annotations.forEach((ann) => {
      if (ann.subtype === 'Widget') {
        const elem = document.getElementById(ann.id);
        if (elem) {
          const val = elem.value;
          if (val) {
            values[ann.id] = val;
          }
        }
      }
    })
    this.setState({values: {...this.state.values, ...values}})
  }

  restoreValues() {
    for (const key in this.state.values) {
      const elem = document.getElementById(key);
      if (elem) {
        if (elem.type === 'checkbox') {
          elem.checked = this.state.values[key] === 'on';
        } else {
          elem.value = this.state.values[key];
        }
      }
    }
  }

  render() {
    return (
      <>
        <Modal
          show={this.props.doc.showForm}
          onHide={this.props.handleClose(this.props.doc.key)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{this.props.doc.name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Document
              ref={this.state.docRef}
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
                  renderInteractiveForms={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={this.restoreValues.bind(this)}
                />
              )) || (
                <Page
                  pageNumber={this.state.pageNumber}
                  renderInteractiveForms={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={this.restoreValues.bind(this)}
                />
              )}
            </Document>
          </Modal.Body>

          <Modal.Footer>
            <div className="pdf-navigation">
              <Button
                variant="outline"
                size="sm"
                disabled={Number(this.state.pageNumber) <= 1}
                onClick={this.firstPage.bind(this)}
                data-testid={"preview-button-first-" + this.props.doc.name}
              >
                &#x23EA;
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={Number(this.state.pageNumber) <= 1}
                onClick={this.previousPage.bind(this)}
                data-testid={"preview-button-prev-" + this.props.doc.name}
              >
                &#x25C4;
              </Button>
              <span>
                &nbsp;
                {(this.state.pageNumber || (this.state.numPages ? 1 : "--")) +
                  " / " +
                  (this.state.numPages || "--")}
                &nbsp;
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={Number(this.state.pageNumber) >= Number(this.state.numPages)}
                onClick={this.nextPage.bind(this)}
                data-testid={"preview-button-next-" + this.props.doc.name}
              >
                &#x25BA;
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={Number(this.state.pageNumber) >= Number(this.state.numPages)}
                onClick={this.lastPage.bind(this)}
                data-testid={"preview-button-last-" + this.props.doc.name}
              >
                &#x23E9;
              </Button>
            </div>
            <Button
              variant="outline-secondary"
              onClick={this.props.handleClose(this.props.doc.key)}
              data-testid={"preview-button-close-" + this.props.doc.name}
            >
              <FormattedMessage defaultMessage="Close" key="button-close" />
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

PDFForm.propTypes = {
  /**
   * The document to preview.
   */
  handleClose: PropTypes.func,
  doc: PropTypes.object,
  docFile: PropTypes.object,
};

export default PDFForm;
