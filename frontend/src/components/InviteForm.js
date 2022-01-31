import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import "styles/InviteForm.scss";

const validateEmail = (mail) => {
  return (value) => {
    let error;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      error = (
        <FormattedMessage defaultMessage="Invalid email" key="invalid-email" />
      );
    } else if (value === mail) {
      error = (
        <FormattedMessage
          defaultMessage="Do not invite yourself"
          key="do-no-invite-yourself"
        />
      );
    }
    return error;
  };
};

const validateName = (value) => {
  let error;

  if (!value) {
    error = <FormattedMessage defaultMessage="Required" key="required-field" />;
  }
  return error;
};

const validateBody = (value) => {
  return undefined;
};

const validateSendsigned = (value) => {
  return undefined;
};

const validateMakecopy = (value) => {
  return undefined;
};

const validate = (mail) => {
  return (values) => {
    let errors = {};
    values.invitees.forEach((val, i) => {
      const nameError = validateName(val.name);
      const emailError = validateEmail(mail)(val.email);
      if (nameError !== undefined) errors[`invitees.${i}.name`] = nameError;
      if (emailError !== undefined) errors[`invitees.${i}.email`] = emailError;
    });
    return errors;
  };
};

const initialValues = (docId) => ({
  invitationText: "",
  sendsignedChoice: true,
  makecopyChoice: false,
  documentId: docId,
  invitees: [
    {
      name: "",
      email: "",
    },
  ],
});

class InviteForm extends React.Component {
  render() {
    const formId = "invite-form-" + this.props.docName;
    return (
      <>
        <Formik
          initialValues={initialValues(this.props.docId)}
          onSubmit={this.props.handleSubmit.bind(this)}
          validate={validate(this.props.mail)}
          enableReinitialize={true}
          validateOnBlur={true}
          validateOnChange={true}
          validateOnMount={true}
        >
          {(fprops) => (
            <Modal
              show={this.props.show}
              onHide={this.props.handleClose}
              size={this.props.size}
              keyboard={false}
            >
              <Form id={formId} data-testid={formId}>
                <Field
                  type="hidden"
                  name="documentId"
                  value={fprops.values.documentId}
                />
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Invite people to sign: {docName}`}
                      key="invite-people"
                      values={{ docName: this.props.docName }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="invitation-text-holder">
                    <BForm.Group className="invitation-text-group">
                      <BForm.Label
                        className="invitation-text-label"
                        htmlFor="invitation-text-input"
                      >
                        <FormattedMessage
                          defaultMessage="Add a message to send to all invitees"
                          key="invitation-text-field"
                        />
                      </BForm.Label>
                      <Field
                        name="invitationText"
                        id="invitation-text-input"
                        data-testid="invitation-text-input"
                        className="invitation-text"
                        validate={validateBody}
                        as="textarea"
                      />
                    </BForm.Group>
                  </div>
                  <div className="sendsigned-choice-holder">
                    <BForm.Group className="sendsigned-choice-group">
                      <BForm.Label
                        className="sendsigned-choice-label"
                        htmlFor="sendsigned-choice-input"
                      >
                        <FormattedMessage
                          defaultMessage="Send final signed document via email to all who signed it"
                          key="sendsigned-choice-field"
                        />
                      </BForm.Label>
                      <Field
                        name="sendsignedChoice"
                        id="sendsigned-choice-input"
                        data-testid="sendsigned-choice-input"
                        className="sendsigned-choice"
                        validate={validateSendsigned}
                        type="checkbox"
                      />
                    </BForm.Group>
                  </div>
                  <div className="makecopy-choice-holder">
                    <BForm.Group className="makecopy-choice-group">
                      <BForm.Label
                        className="makecopy-choice-label"
                        htmlFor="makecopy-choice-input"
                      >
                        <FormattedMessage
                          defaultMessage="Make a copy of the document to sign, and keep the original unsigned"
                          key="makecopy-choice-field"
                        />
                      </BForm.Label>
                      <Field
                        name="makecopyChoice"
                        id="makecopy-choice-input"
                        data-testid="makecopy-choice-input"
                        className="makecopy-choice"
                        validate={validateMakecopy}
                        type="checkbox"
                      />
                    </BForm.Group>
                  </div>
                  <FieldArray name="invitees" validateOnChange={true}>
                    {(arrayHelpers) => (
                      <div>
                        {fprops.values.invitees.length > 0 &&
                          fprops.values.invitees.map((invitee, index) => (
                            <div className="invitation-fields" key={index}>
                              {index > 0 && (
                                <div className="invitee-form-dismiss">
                                  <ESTooltip
                                    tooltip={
                                      <FormattedMessage
                                        defaultMessage="Remove this entry from invitation"
                                        key="rm-invitation-tootip"
                                      />
                                    }
                                  >
                                    <BButton
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        arrayHelpers.remove(index);
                                        window.setTimeout(() => {
                                          document
                                            .getElementById(
                                              "invitation-text-input"
                                            )
                                            .focus();
                                          document
                                            .getElementById(
                                              "invitation-text-input"
                                            )
                                            .blur();
                                        }, 0);
                                      }}
                                    >
                                      ×
                                    </BButton>
                                  </ESTooltip>
                                </div>
                              )}
                              <div className="invitee-form-row" key={index}>
                                <div className="invitee-form-name">
                                  <BForm.Group>
                                    <BForm.Label
                                      htmlFor={`invitees.${index}.name`}
                                    >
                                      <FormattedMessage
                                        defaultMessage="Name"
                                        key="name-input-field"
                                      />
                                    </BForm.Label>
                                    <ErrorMessage
                                      name={`invitees.${index}.name`}
                                      component="div"
                                      className="field-error"
                                    />
                                    <Field
                                      name={`invitees.${index}.name`}
                                      data-testid={`invitees.${index}.name`}
                                      value={invitee.name}
                                      placeholder="Jane Doe"
                                      as={BForm.Control}
                                      type="text"
                                      validate={validateName}
                                      isValid={
                                        fprops.touched.invitees &&
                                        fprops.touched.invitees[index] &&
                                        fprops.touched.invitees[index].name &&
                                        (!fprops.errors.invitees ||
                                          (fprops.errors.invitees &&
                                            (!fprops.errors.invitees[index] ||
                                              (fprops.errors.invitees[index] &&
                                                !fprops.errors.invitees[index]
                                                  .name))))
                                      }
                                      isInvalid={
                                        fprops.touched.invitees &&
                                        fprops.touched.invitees[index] &&
                                        fprops.touched.invitees[index].name &&
                                        fprops.errors.invitees &&
                                        fprops.errors.invitees[index] &&
                                        fprops.errors.invitees[index].name
                                      }
                                    />
                                  </BForm.Group>
                                </div>
                                <div className="invitee-form-email">
                                  <BForm.Group>
                                    <BForm.Label
                                      htmlFor={`invitees.${index}.email`}
                                    >
                                      <FormattedMessage
                                        defaultMessage="Email"
                                        key="email-input-field"
                                      />
                                    </BForm.Label>
                                    <ErrorMessage
                                      name={`invitees.${index}.email`}
                                      component="div"
                                      className="field-error"
                                    />
                                    <Field
                                      name={`invitees.${index}.email`}
                                      data-testid={`invitees.${index}.email`}
                                      value={invitee.email}
                                      placeholder="jane@example.com"
                                      as={BForm.Control}
                                      type="email"
                                      validate={validateEmail(this.props.mail)}
                                      isValid={
                                        fprops.touched.invitees &&
                                        fprops.touched.invitees[index] &&
                                        fprops.touched.invitees[index].email &&
                                        (!fprops.errors.invitees ||
                                          (fprops.errors.invitees &&
                                            (!fprops.errors.invitees[index] ||
                                              (fprops.errors.invitees[index] &&
                                                !fprops.errors.invitees[index]
                                                  .email))))
                                      }
                                      isInvalid={
                                        fprops.touched.invitees &&
                                        fprops.touched.invitees[index] &&
                                        fprops.touched.invitees[index].email &&
                                        fprops.errors.invitees &&
                                        fprops.errors.invitees[index] &&
                                        fprops.errors.invitees[index].email
                                      }
                                    />
                                  </BForm.Group>
                                </div>
                              </div>
                            </div>
                          ))}
                        <ESTooltip
                          tooltip={
                            <FormattedMessage
                              defaultMessage="Invite one more person to sign this document"
                              key="add-invitation-tootip"
                            />
                          }
                        >
                          <Button
                            variant="outline-secondary"
                            data-testid={
                              "button-add-invitation-" + this.props.docName
                            }
                            onClick={() =>
                              arrayHelpers.push({ name: "", email: "" })
                            }
                          >
                            <FormattedMessage
                              defaultMessage="Invite more people"
                              key="add-invite"
                            />
                          </Button>
                        </ESTooltip>
                      </div>
                    )}
                  </FieldArray>
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Dismiss invitation form"
                        key="cancel-invitation-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-secondary"
                      onClick={this.props.handleClose}
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-invite"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Send invitations to sign to indicated people"
                        key="send-invitation-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-success"
                      onClick={fprops.submitForm}
                      id={"button-send-invites-" + this.props.docName}
                      disabling={true}
                      disabled={!fprops.isValid}
                      data-testid={"button-send-invites-" + this.props.docName}
                    >
                      <FormattedMessage
                        defaultMessage="Invite"
                        key="send-invite"
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

InviteForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  docId: PropTypes.number,
  docName: PropTypes.string,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(InviteForm);
