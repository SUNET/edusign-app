import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";
import { validateName, validateEmail } from "components/InviteForm";

import "styles/DelegateForm.scss";

const initialValues = (docKey) => ({
  delegationName: "",
  delegationEmail: "",
  documentKey: docKey,
});

class DelegateForm extends React.Component {
  render() {
    return (
      <>
        <Formik
          initialValues={initialValues(this.props.doc.key)}
          enableReinitialize={true}
          onSubmit={async (values) => {
            await this.props.handleSubmit(values, this.props);
            this.props.handleClose();
          }}
        >
          {(fprops) => (
            <Modal
              show={this.props.doc.delegating}
              onHide={this.props.handleClose}
              size={this.props.size}
            >
              <Form data-testid={"delegate-form-" + this.props.doc.name}>
                <Field
                  type="hidden"
                  name="documentId"
                  value={fprops.values.documentId}
                />
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Delegate signature of {docName}`}
                      key="delegate-form-title"
                      values={{ docName: this.props.doc.name }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="delegation-form-name">
                    <BForm.Group>
                      <BForm.Label htmlFor="delegation-name-input">
                        <FormattedMessage
                          defaultMessage="Name"
                          key="name-input-field"
                        />
                      </BForm.Label>
                      <ErrorMessage
                        name="delegationName"
                        component="div"
                        className="field-error"
                      />
                      <Field
                        name="delegationName"
                        id="delegation-name-input"
                        value={fprops.values.delegationName}
                        placeholder="Jane Doe"
                        as={BForm.Control}
                        type="text"
                        validate={validateName}
                        isValid={fprops.touched.delegationName && !fprops.errors.delegationName}
                        isInvalid={fprops.touched.delegationName && fprops.errors.delegationName}
                      />
                    </BForm.Group>
                  </div>
                  <div className="delegation-form-email">
                    <BForm.Group>
                      <BForm.Label htmlFor="delegation-email-input">
                        <FormattedMessage
                          defaultMessage="Email"
                          key="email-input-field"
                        />
                      </BForm.Label>
                      <ErrorMessage
                        name="delegationEmail"
                        component="div"
                        className="field-error"
                      />
                      <Field
                        name="delegationEmail"
                        id="delegation-email-input"
                        value={fprops.values.delegationEmail}
                        placeholder="Jane Doe"
                        as={BForm.Control}
                        type="text"
                        validate={validateEmail(this.props.email)}
                        isValid={fprops.touched.delegationEmail && !fprops.errors.delegationEmail}
                        isInvalid={fprops.touched.delegationEmail && fprops.errors.delegationEmail}
                      />
                    </BForm.Group>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    className="tooltip-in-modal"
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Dismiss delegation form"
                        key="cancel-delegation-button-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-secondary"
                      onClick={this.props.handleClose}
                      id={
                        "button-cancel-delegating-" + this.props.doc.name
                      }
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-delegate"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    className="tooltip-in-modal"
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Delegate invitation to sign"
                        key="delegate-button-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-success"
                      onClick={fprops.submitForm}
                      id={"button-delegate-" + this.props.doc.name}
                      disabling={true}
                      disabled={!fprops.isValid}
                    >
                      <FormattedMessage
                        defaultMessage="Delegate"
                        key="delegate-invite"
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

DelegateForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  doc: PropTypes.object,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(DelegateForm);

