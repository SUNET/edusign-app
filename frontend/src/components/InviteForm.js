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

import "styles/InviteForm.scss";

export const validateEmail = (mail) => {
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

export const validateName = (value) => {
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

const validateNewname = (props) => {
  return (value) => {
    let error;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else {
      const dupError = (
        <FormattedMessage
          defaultMessage="A document with that name has already been loaded"
          key="save-doc-problem-dup"
        />
      );
      props.templates.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });

      props.documents.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });

      props.owned.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });
    }
    return error;
  };
};

const validateLoa = (value) => {
  return undefined;
};

const validate = (props) => {
  return (values) => {
    let errors = {};
    values.invitees.forEach((val, i) => {
      const nameError = validateName(val.name);
      const emailError = validateEmail(props.mail)(val.email);
      if (nameError !== undefined) errors[`invitees.${i}.name`] = nameError;
      if (emailError !== undefined) errors[`invitees.${i}.email`] = emailError;
    });
    if (values.makecopyChoice) {
      const newNameError = validateNewname(props)(values.newnameInput);
      if (newNameError !== undefined) errors.newnameInput = newNameError;
    }
    return errors;
  };
};

const initialValues = (props) => ({
  invitationText: "",
  sendsignedChoice: true,
  makecopyChoice: false,
  isTemplate: props.isTemplate,
  newnameInput: nameForCopy(props),
  loa: "none",
  documentId: props.docId,
  invitees: [
    {
      name: "",
      email: "",
    },
  ],
});

class InviteForm extends React.Component {
  inviteeControl(fprops) {
    return (
      <FieldArray name="invitees" validateOnChange={true}>
        {(arrayHelpers) => (
          <div>
            {fprops.values.invitees.length > 0 &&
              fprops.values.invitees.map((invitee, index) => (
                <div className="invitation-fields" key={index}>
                  {index > 0 && (
                    <div className="invitee-form-dismiss">
                      <ESTooltip
                        inModal={true}
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
                  )}
                  <div className="invitee-form-row" key={index}>
                    <div className="invitee-form-name">
                      <BForm.Group>
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
                      <BForm.Group>
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
                          validate={validateEmail(this.props.mail)}
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
                  </div>
                </div>
              ))}
            <ESTooltip
              helpId={"button-add-invitation-" + this.props.docName}
              inModal={true}
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
    const sendsignedControl = (
      <div className="sendsigned-choice-holder">
        <BForm.Group className="sendsigned-choice-group">
          <ESTooltip
            helpId="sendsigned-choice-input"
            inModal={true}
            tooltip={
              <FormattedMessage
                defaultMessage="Send final signed document via email to all who signed it."
                key="sendsigned-choice-help"
              />
            }
          >
            <BForm.Label
              className="sendsigned-choice-label"
              htmlFor="sendsigned-choice-input"
            >
              <FormattedMessage
                defaultMessage="Send signed document in email"
                key="sendsigned-choice-field"
              />
            </BForm.Label>
          </ESTooltip>
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
    );
    const makecopyControl = (props) => {
      if (!props.isTemplate) {
        return (
          <div className="makecopy-choice-holder">
            <BForm.Group className="makecopy-choice-group">
              <ESTooltip
                helpId="makecopy-choice-field"
                inModal={true}
                tooltip={
                  <FormattedMessage
                    defaultMessage="Keep your original document as a template and creates a copy to invite others to sign."
                    key="makecopy-choice-help"
                  />
                }
              >
                <BForm.Label
                  className="makecopy-choice-label"
                  htmlFor="makecopy-choice-input"
                >
                  <FormattedMessage
                    defaultMessage="Create template"
                    key="makecopy-choice-field"
                  />
                </BForm.Label>
              </ESTooltip>
              <Field
                name="makecopyChoice"
                id="makecopy-choice-input"
                data-testid="makecopy-choice-input"
                className="makecopy-choice"
                validate={validateMakecopy}
                type="checkbox"
                checked={props.make_copy}
                onChange={props.handleMakeCopyToggle}
              />
            </BForm.Group>
          </div>
        );
      } else {
        return <Field name="makecopyChoice" value={true} type="hidden" />;
      }
    };
    const loaControl = (
      <>
        <div className="loa-select-holder">
          <BForm.Group className="loa-select-group">
            <BForm.Label
              className="loa-select-label"
              htmlFor="loa-select-input"
              onClick={this.props.handleToggleLoa}
            >
              {(!this.props.show_loa && (
                <span className="security-level-sign">+</span>
              )) || <span className="security-level-sign">-</span>}
              <FormattedMessage
                defaultMessage="Security level for the signature"
                key="loa-select-field"
              />
            </BForm.Label>
            <div
              id="loa-select-field"
              data-testid="loa-select-field"
              className={(!this.props.show_loa && "hidden") || ""}
            >
              {this.props.loas.map((level, i) => {
                return (
                  <BForm.Label key={i} className="loa-checkbox">
                    <Field
                      name="loa"
                      value={level.uri}
                      className="loa-select"
                      type="checkbox"
                    />
                    {level.name}
                  </BForm.Label>
                );
              })}
            </div>
          </BForm.Group>
        </div>
      </>
    );
    const newNameControl = (props, fprops) => {
      if (props.make_copy || props.isTemplate) {
        return (
          <>
            <div className="newname-text-holder">
              <BForm.Group className="newname-text-group">
                <BForm.Label
                  className="newname-text-label"
                  htmlFor="newnameInput"
                >
                  <FormattedMessage
                    defaultMessage="New name for document to send for signatures:"
                    key="newname-text-field"
                  />
                </BForm.Label>
                <ErrorMessage
                  name="newnameInput"
                  component="div"
                  className="field-error"
                />
                <Field
                  name="newnameInput"
                  data-testid="newnameInput"
                  as={BForm.Control}
                  type="text"
                  validate={validateNewname(props)}
                  isValid={!fprops.errors.newnameInput}
                  isInvalid={fprops.errors.newnameInput}
                />
              </BForm.Group>
            </div>
          </>
        );
      } else {
        return <Field name="newnameInput" value="" type="hidden" />;
      }
    };
    const loaControlHidden = <Field name="loa" value="none" type="hidden" />;
    const formId = "invite-form-" + this.props.docName;
    return (
      <>
        <Formik
          initialValues={initialValues(this.props)}
          onSubmit={this.props.handleSubmit.bind(this)}
          validate={validate(this.props)}
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
                <Field type="hidden" name="isTemplate" />
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
                  {sendsignedControl}
                  {makecopyControl(this.props)}
                  {newNameControl(this.props, fprops)}
                  {loaControlHidden}
                  {this.inviteeControl(fprops)}
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    helpId="button-cancel-invite"
                    inModal={true}
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
                    helpId={"button-send-invites-" + this.props.docName}
                    inModal={true}
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
  isTemplate: PropTypes.bool,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

InviteForm.defaultProps = {
  isTemplate: false,
};

export default injectIntl(InviteForm);
