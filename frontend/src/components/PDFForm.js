import React from "react";
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

  // https://github.com/mozilla/pdf.js/issues/15597
  // remove this function once the fix for the above reaches react-pdf,
  // which should depend on pdfjs-dist >= 3.0.279
  async fixCheckboxBug() {
    const pdf = this.state.docRef.current.state.pdf;
    const page = await pdf.getPage(this.state.pageNumber);
    const annotations = await page.getAnnotations();
    annotations.forEach((ann) => {
      if (ann.subtype === "Widget" && ann.checkBox) {
        const elemId = `pdfjs_internal_id_${ann.id}`;
        window.setTimeout(() => {
          const elem = document.getElementById(elemId);
          if (elem) {
            elem.addEventListener("click", (e) => {
              const checked = e.target.checked;
              setTimeout(() => {
                e.target.checked = checked;
              }, 100);
            });
          }
        }, 500);
      }
    });
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
        const elem = document.getElementById(`pdfjs_internal_id_${ann.id}`);
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
      const elem = document.getElementById(`pdfjs_internal_id_${key}`);

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

  async initPage() {
    await this.fixCheckboxBug();
    this.restoreValues();
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
                  renderForms={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={this.initPage.bind(this)}
                />
              )) || (
                <Page
                  pageNumber={this.state.pageNumber}
                  renderForms={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={this.initPage.bind(this)}
                />
              )}
            </Document>
          </Modal.Body>

          <Modal.Footer>
            <div className="pdf-navigation">
              <Pagination
                numPages={this.state.numPages}
                pageNumber={this.state.pageNumber}
                firstPage={this.firstPage}
                previousPage={this.previousPage}
                nextPage={this.nextPage}
                lastPage={this.lastPage}
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
