import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { Document, Page } from "react-pdf/dist/esm/entry.webpack";
import { nameForCopy } from "components/utils";
import { validateNewname } from "components/InviteForm";

import "styles/DocPreview.scss";
import "styles/PDFForm.scss";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

const initValues = (props) => ({ newfname: nameForCopy(props) });

const validate = (props) => {
  return (values) => {
    const errors = {};
    const newNameError = validateNewname(props)(values.newfname);
    if (newNameError !== undefined) errors.newfname = newNameError;
    return errors;
  };
};

/**
 * @desc To show a modal dialog with a paginated view of a PDF, using PDF.js.
 * @component
 */
class PDFForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
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

  changePage(offset) {
    this.setState({ pageNumber: this.state.pageNumber + offset });
  }

  async firstPage() {
    await collectValues();
    this.setState({ pageNumber: 1 });
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
    this.setState({ pageNumber: this.state.numPages });
    this.restoreValues();
  }

  async collectValues() {
    const pdf = this.state.docRef.current.state.pdf;
    const page = await pdf.getPage(this.state.pageNumber);
    const annotations = await page.getAnnotations();
    const values = {};
    const radio = {};
    annotations.forEach((ann) => {
      if (ann.subtype === "Widget") {
        let val;
        const elem = document.getElementById(ann.id);
        if (elem) {
          if (ann.checkBox) {
            val = elem.checked ? "on" : "off";
          } else if (ann.radioButton) {
            const key = ann.fieldName;
            if (radio.hasOwnProperty(key)) {
              radio[key] += 1;
            } else {
              radio[key] = 1;
            }
            if (elem.checked) {
              val = radio[key];
            }
          } else {
            val = elem.value;
          }
        }
        if (val) {
          values[ann.id] = { value: val, name: ann.fieldName };
        }
      }
    });
    this.setState({ values: { ...this.state.values, ...values } });
  }

  restoreValues() {
    for (const key in this.state.values) {
      const elem = document.getElementById(key);

      if (elem) {
        if (elem.type === "checkbox") {
          elem.checked = this.state.values[key].value === "on";
        } else if (elem.type === "radio") {
          elem.checked = true;
        } else {
          elem.value = this.state.values[key].value;
        }
      }
    }
  }

  resetValues() {
    this.setState({ values: {} });
  }

  render() {
    if (!this.props.show) return "";
    return (
      <>
        <Modal
          id="pdf-form-modal"
          show={this.props.show}
          onHide={this.props.handleClose}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
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
                    <BForm.Group className="newfname-text-group">
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
                disabled={
                  Number(this.state.pageNumber) >= Number(this.state.numPages)
                }
                onClick={this.nextPage.bind(this)}
                data-testid={"preview-button-next-" + this.props.doc.name}
              >
                &#x25BA;
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  Number(this.state.pageNumber) >= Number(this.state.numPages)
                }
                onClick={this.lastPage.bind(this)}
                data-testid={"preview-button-last-" + this.props.doc.name}
              >
                &#x23E9;
              </Button>
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

export default PDFForm;
