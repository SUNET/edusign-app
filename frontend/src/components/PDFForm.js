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
import { docToFile } from "components/utils";

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
function PDFForm(props) {

  const docFile = useMemo(() => docToFile(props.doc), [props.doc]);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [formValues, setFormValues] = useState({});
  const docRef = useRef(null);
  const formRef = useRef(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function changePage(offset) {
    setPageNumber(pageNumber + offset);
  }

  async function firstPage() {
    await collectValues();
    setPageNumber(1);
    restoreValues();
  }

  async function previousPage() {
    await collectValues();
    changePage(-1);
    restoreValues();
  }

  async function nextPage() {
    await collectValues();
    changePage(1);
    restoreValues();
  }

  async function lastPage() {
    await collectValues();
    setPageNumber(numPages);
    restoreValues();
  }

  async function collectValues() {
    const pdf = docRef.current.state.pdf;
    const page = await pdf.getPage(pageNumber);
    const annotations = await page.getAnnotations();
    const values = {};
    annotations.filter(annotation => annotation.fieldType)
      .forEach(annotation => {
        values[annotation.id] = {
          value: annotation.fieldValue || '',
          name: annotation.fieldName
        };
      });
    setFormValues({ ...formValues, ...values } });
  }

  function restoreValues() {
    const formElements = document.querySelectorAll('input[data-pdf-field]');
    
    formElements.forEach(element => {
      const fieldName = element.getAttribute('data-pdf-field');
      for (let fieldID in formValues) {
        if (formValues[fieldID].name === fieldName) {
          element.value = formValues[fieldID].value;
          break;
        }
      }
    });
  }

  async function initPage() {
    restoreValues();
  }

  if (!props.show) return "";

  return (
    <>
      <Modal
        id="pdf-form-modal"
        show={props.show}
        onHide={props.handleClose}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="pdf-form-header">
          <Formik
            innerRef={formRef}
            initialValues={initValues(props)}
            validate={validate(props)}
            enableReinitialize={true}
            validateOnBlur={true}
            validateOnChange={true}
            validateOnMount={true}
          >
            {(fprops) => (
              <Form data-testid={"newfname-form-" + props.doc.name}>
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
                      validate={validateNewname(props)}
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
            ref={docRef}
            file={docFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onPassword={(c) => {
              throw new Error("Never password");
            }}
            options={{
              cMapUrl: "/js/cmaps/",
              cMapPacked: true,
              enableXfa: true,
            }}
          >
            {(props.width < 550 && (
              <Page
                pageNumber={pageNumber}
                width={props.width - 20}
                renderAnnotationLayer={true}
                renderForms={true}
                onRenderSuccess={initPage}
              />
            )) || (
              <Page
                pageNumber={pageNumber}
                renderAnnotationLayer={true}
                renderForms={true}
                onRenderSuccess={initPage}
              />
            )}
          </Document>
        </Modal.Body>

        <Modal.Footer>
          <div className="pdf-navigation">
            <Pagination
              numPages={numPages}
              pageNumber={pageNumber}
              firstPage={firstPage}
              previousPage={previousPage}
              nextPage={nextPage}
              lastPage={lastPage}
              index={Number(0)}
            />
          </div>
          <Button
            variant="outline-primary"
            onClick={props.handleSendPDFForm}
            data-testid={"pdfform-button-send-" + props.doc.name}
          >
            <FormattedMessage defaultMessage="Done" key="button-sendform" />
          </Button>
          <Button
            variant="outline-secondary"
            onClick={props.handleClose}
            data-testid={"preview-button-close-" + props.doc.name}
          >
            <FormattedMessage defaultMessage="Close" key="button-close" />
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
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
