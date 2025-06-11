import React, { useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Document, Page } from "react-pdf";
import { nameForCopy } from "components/utils";
import { validateNewname } from "components/validation";
import Pagination from "components/Pagination";

import "styles/DocPreview.scss";
import "styles/PDFForm.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { docToFile } from "components/utils";

const initValues = (props) => ({ newfname: nameForCopy(props) });

const validate = (props) => {
  return (values) => {
    const errors = {};
    const newNameError = validateNewname(props)(values.newfname);
    if (newNameError !== undefined) errors.newfname = newNameError;
    return errors;
  };
};

const documentOptions = {
  cMapUrl: "/js/cmaps/",
  cMapPacked: true,
  enableXfa: true,
  standardFontDataUrl: '/js/standard_fonts/',
};

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
class PDFForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      docFile: docToFile(props.doc),
      formRef: React.createRef(),
      docRef: React.createRef(),
      numPages: null,
      pageNumber: 1,
      values: {},
    };
  }

  onDocumentLoadSuccess({ numPages }) {
    this.setState({ numPages });
  }

  async changePage(number) {
    const newFile = await docRef.current.linkService.current.pdfDocument.saveDocument();
    this.setState({ docFile: newFile, pageNumber: number });
  }

  async firstPage() {
    await this.changePage(1);
  }

  async previousPage() {
    await this.changePage(this.state.pageNumber - 1);
  }

  async nextPage() {
    await this.changePage(this.state.pageNumber + 1);
  }

  async lastPage() {
    await this.changePage(this.state.numPages);
  }

  render () {
    if (!this.props.show || this.props.docFile === null) return "";
    return (
      <>
        <Modal
          id="pdf-form-modal"
          show={this.props.show}
          onHide={this.props.handleClose}
          size="lg"
          centered
        >
          <Modal.Header closeButton className="pdf-form-header">
            <Formik
              innerRef={this.state.formRef}
              initialValues={initValues(this.props)}
              validate={validate(this.props)}
              enableReinitialize={true}
              validateOnBlur={true}
              validateOnChange={true}
              validateOnMount={true}
            >
              {(fprops) => (
                <Form data-testid={"newfname-form-" + this.props.doc.name}>
                  <div className="newfname-text-holder">
                    <BForm.Group className="newfname-text-group form-group">
                      <BForm.Label
                        className="newfname-text-label"
                        htmlFor="newfname"
                      >
                        <FormattedMessage
                          defaultMessage="Set name for new document"
                          key="newfname-text-field"
                        />
                      </BForm.Label>
                      <Field
                        name="newfname"
                        id="newfname"
                        data-testid="newfname-text-input"
                        className="newfname-text"
                        as={BForm.Control}
                        type="text"
                        validate={validateNewname(this.props)}
                        isValid={!fprops.errors.newfname}
                        isInvalid={fprops.errors.newfname}
                      />
                      <ErrorMessage
                        name="newfname"
                        component="div"
                        className="field-error"
                      />
                    </BForm.Group>
                  </div>
                </Form>
              )}
            </Formik>
          </Modal.Header>

          <Modal.Body>
            <Document
              ref={this.state.docRef}
              file={this.props.docFile}
              onLoadSuccess={this.onDocumentLoadSuccess.bind(this)}
              onPassword={(c) => {
                throw new Error("Never password");
              }}
              options={documentOptions}
            >
              {(this.props.width < 550 && (
                <Page
                  pageNumber={this.state.pageNumber}
                  width={this.props.width - 20}
                  renderAnnotationLayer={true}
                  renderForms={true}
                />
              )) || (
                <Page
                  pageNumber={this.state.pageNumber}
                  renderAnnotationLayer={true}
                  renderForms={true}
                />
              )}
            </Document>
          </Modal.Body>

          <Modal.Footer>
            <div className="pdf-navigation">
              <Pagination
                numPages={this.state.numPages}
                pageNumber={this.state.pageNumber}
                firstPage={this.firstPage.bind(this)}
                previousPage={this.previousPage.bind(this)}
                nextPage={this.nextPage.bind(this)}
                lastPage={this.lastPage.bind(this)}
                index={Number(0)}
              />
            </div>
            <Button
              variant="outline-primary"
              onClick={this.props.handleSendPDFForm.bind(this)}
              data-testid={"pdfform-button-send-" + this.props.doc.name}
            >
              <FormattedMessage defaultMessage="Done" key="button-sendform" />
            </Button>
            <Button
              variant="outline-secondary"
              onClick={this.props.handleClose}
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

export default injectIntl(PDFForm);
