import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";
import { validateNewname } from "components/InviteForm";

import "styles/PDFForm.scss";

const initialValues = (form) => {
  const fields = form.map((field) => {
    const f = {};
    let value = "";
    if (field.value !== undefined) {
      value = field.value;
    }
    f[field.name] = value;
    return f;
  });
  return {fields: fields};
};

class PDFForm extends React.Component {
  render() {
    if (this.props.show === false) {
      return "";
    }

    const fields = (fprops) => {
      return (
        <FieldArray name="fields" validateOnChange={false}>
          <>
          {this.props.form.map((field, i) => {
              if (field.type === "7") {
                return (
                  <div key={i} className="pdfform-field">
                    <BForm.Group className="pdfform-text-group">
                      <BForm.Label
                        className="pdfform-text-label"
                        htmlFor={field.name + "-pdfform-text-input"}
                      >
                        {field.label}
                      </BForm.Label>
                      <Field
                        name={field.name + "-pdfform-text-input"}
                        id={field.name + "-pdfform-text-input"}
                        value={fprops.values.fields[i].value}
                        data-testid={field.name + "-pdfform-text-input"}
                        className="pdfform-text-nput"
                        as="textarea"
                      />
                    </BForm.Group>
                  </div>
                );
              }
            })}
          </>
        </FieldArray>);
    };

    return (
      <>
        <Formik
          initialValues={initialValues(this.props.form)}
          enableReinitialize={true}
          onSubmit={async (values) => {
            await this.props.handleSubmit(values, this.props);
            this.props.handleClose();
          }}
        >
          {(fprops) => (
            <Modal
              show={this.props.show}
              onHide={this.props.handleClose}
              size={this.props.size}
            >
              <Form data-testid={"pdfform-" + this.props.doc.name}>
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Fill in PDF form for "{docName}"`}
                      key="pdfform-title"
                      values={{ docName: this.props.doc.name }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <>
                    <BForm.Group className="newname-text-group">
                      <BForm.Label
                        className="newname-text-label"
                        htmlFor="newname"
                      >
                        <FormattedMessage
                          defaultMessage="New name for document to send for signatures:"
                          key="newname-text-field"
                        />
                      </BForm.Label>
                      <ErrorMessage
                        name="newname"
                        component="div"
                        className="field-error"
                      />
                      <Field
                        name="newname"
                        data-testid="newname"
                        as={BForm.Control}
                        type="text"
                        validate={validateNewname(this.props)}
                        isValid={!fprops.errors.newname}
                        value={fprops.values.newname}
                      />
                    </BForm.Group>
                    {fields(fprops)}
                  </>
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    helpId={"button-cancel-pdfform-" + this.props.doc.name}
                    inModal={true}
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Dismiss PDF form"
                        key="cancel-pdfform"
                      />
                    }
                  >
                    <Button
                      variant="outline-secondary"
                      onClick={this.props.handleClose}
                      data-testid={
                        "button-cancel-pdfform-" + this.props.doc.name
                      }
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-pdfform"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    helpId={"button-pdfform-" + this.props.doc.name}
                    inModal={true}
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Submit PDF form"
                        key="submit-pdfform-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-success"
                      onClick={fprops.submitForm}
                      id={"button-pdfform-" + this.props.doc.name}
                      disabling={true}
                      disabled={!fprops.isValid}
                      data-testid={"button-pdfform-" + this.props.doc.name}
                    >
                      <FormattedMessage
                        defaultMessage="Submit"
                        key="submit-pdfform-button"
                      />
                    </Button>
                  </ESTooltip>
                </Modal.Footer>
              </Form>
            </Modal>
          )}
        </Formik>
      </>
    );
  }
}

PDFForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  doc: PropTypes.object,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(PDFForm);
