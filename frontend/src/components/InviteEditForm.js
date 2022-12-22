import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";
import { nameForCopy } from "components/utils";
import { validateEmail, validateLang } from "components/InviteForm";

import "styles/InviteForm.scss";

const initialValues = (props) => {
  const vals = {
    documentKey: props.docKey,
    invitationText: "",
    invitees: [],
  };
  props.doc.pending.forEach((invite) => {
    vals.invitees.push({
      ...invite,
    });
  });
  return vals;
};

const validate = () => {
  return {};
};

const validateBody = (value) => {
  return undefined;
};

export const validateName = (value) => {
  let error;

  if (!value) {
    error = <FormattedMessage defaultMessage="Required" key="required-field" />;
  }
  return error;
};

class InviteEditForm extends React.Component {
  inviteeControl(fprops) {
    return (
      <FieldArray name="invitees" validateOnChange={false}>
        {(arrayHelpers) => (
          <div>
            {fprops.values.invitees.length > 0 &&
              fprops.values.invitees.map((invitee, index) => (
                <div className="invitation-fields" key={index}>
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
                              .getElementById("invitation-text-input")
                              .focus();
                            document
                              .getElementById("invitation-text-input")
                              .blur();
                          }, 0);
                        }}
                      >
                        ×
                      </BButton>
                    </ESTooltip>
                  </div>
                  <div className="invitee-form-row" key={index}>
                    <div className="invitee-form-name">
                      <BForm.Group className="form-group">
                        <BForm.Label htmlFor={`invitees.${index}.name`}>
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
                                    !fprops.errors.invitees[index].name))))
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
                      <BForm.Group className="form-group">
                        <BForm.Label htmlFor={`invitees.${index}.email`}>
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
                          validate={validateEmail(this.props.mail, this.props.mail_aliases)}
                          isValid={
                            fprops.touched.invitees &&
                            fprops.touched.invitees[index] &&
                            fprops.touched.invitees[index].email &&
                            (!fprops.errors.invitees ||
                              (fprops.errors.invitees &&
                                (!fprops.errors.invitees[index] ||
                                  (fprops.errors.invitees[index] &&
                                    !fprops.errors.invitees[index].email))))
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
                    <div className="invitee-form-language">
                      <BForm.Group className="form-group">
                        <BForm.Label htmlFor={`invitees.${index}.language`}>
                          <FormattedMessage
                            defaultMessage="Language"
                            key="language-input-field"
                          />
                        </BForm.Label>
                        <ErrorMessage
                          name={`invitees.${index}.language`}
                          component="div"
                          className="field-error"
                        />
                        <Field
                          name={`invitees.${index}.language`}
                          data-testid={`invitees.${index}.language`}
                          value={invitee.language}
                          as={BForm.Select}
                          validate={validateLang}
                          isValid={
                            fprops.touched.invitees &&
                            fprops.touched.invitees[index] &&
                            fprops.touched.invitees[index].language &&
                            (!fprops.errors.invitees ||
                              (fprops.errors.invitees &&
                                (!fprops.errors.invitees[index] ||
                                  (fprops.errors.invitees[index] &&
                                    !fprops.errors.invitees[index].language))))
                          }
                          isInvalid={
                            fprops.touched.invitees &&
                            fprops.touched.invitees[index] &&
                            fprops.touched.invitees[index].language &&
                            fprops.errors.invitees &&
                            fprops.errors.invitees[index] &&
                            fprops.errors.invitees[index].language
                          }
                        >
                          {(AVAILABLE_LANGUAGES.map((lang, i) => (
                            <option key={i} value={lang[0]}>{lang[1]}</option>
                          ))
                          )}
                        </Field>
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
                data-testid={"button-add-invitation-" + this.props.docName}
                onClick={() => arrayHelpers.push({ name: "", email: "" })}
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
    );
  }
  render() {
    const formId = "invite-form-" + this.props.docName;
    return (
      <>
        <Formik
          initialValues={initialValues(this.props)}
          onSubmit={this.props.handleSubmit.bind(this)}
          validate={validate}
          enableReinitialize={true}
          validateOnBlur={true}
          validateOnChange={true}
          validateOnMount={true}
          initialErrors={{}}
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
                  name="documentKey"
                  value={fprops.values.documentKey}
                />
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Edit invitations for {docName}`}
                      key="edit-invitation"
                      values={{ docName: this.props.docName }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="invitation-text-holder">
                    <BForm.Group className="invitation-text-group form-group">
                      <BForm.Label
                        className="invitation-text-label"
                        htmlFor="invitation-text-input"
                      >
                        <FormattedMessage
                          defaultMessage="Add an (optional) message to send to all new invitees"
                          key="edit-invitation-text-field"
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
                  {this.inviteeControl(fprops)}
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Dismiss edit form"
                        key="cancel-invitation-edit-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-secondary"
                      onClick={this.props.handleCloseResetting(
                        fprops.resetForm
                      )}
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-edit-invite"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Save changes to invitation"
                        key="save-edit-invitation-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-success"
                      onClick={fprops.submitForm}
                      id={"button-save-edit-invitation-" + this.props.docName}
                      disabling={true}
                      disabled={!fprops.isValid}
                      data-testid={
                        "button-save-edit-invitation-" + this.props.docName
                      }
                    >
                      <FormattedMessage
                        defaultMessage="Save"
                        key="save-edit-invitation"
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

InviteEditForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  docKey: PropTypes.string,
  docName: PropTypes.string,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(InviteEditForm);
