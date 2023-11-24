import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import {
  Formik,
  Form,
  Field,
  ErrorMessage,
  FieldArray,
  useFormikContext,
} from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import Cookies from "js-cookie";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ESTooltip } from "containers/Overlay";
import { nameForCopy } from "components/utils";

import "styles/InviteForm.scss";

export const validateEmail = (props, allValues, idx, status) => {
  const mail = props.mail;
  const mail_aliases = props.mail_aliases;
  return (value) => {
    let error;
    if (status !== undefined && !status.validate) return error;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      error = (
        <FormattedMessage defaultMessage="Invalid email" key="invalid-email" />
      );
    } else if (
      value.toLowerCase() === mail ||
      (mail_aliases !== undefined && mail_aliases.includes(value.toLowerCase()))
    ) {
      error = (
        <FormattedMessage
          defaultMessage="Do not invite yourself"
          key="do-no-invite-yourself"
        />
      );
    } else {
      let count = 0;
      allValues.forEach((val, i) => {
        if (idx > i && val.email.toLowerCase() === value.toLowerCase()) {
          count += 1;
        }
      });
      if (count > 0) {
        error = (
          <FormattedMessage
            defaultMessage="That email has already been invited"
            key="email-problem-dup"
          />
        );
      }
    }
    return error;
  };
};

export const validateName = (props, index) => {
  const _validateName = (value) => {
    let error;

    if (props.max_signatures < index) {
      error = (
        <FormattedMessage
          defaultMessage="It is only possible to invite at most {max_signatures} people"
          key="too-many-invitations"
          values={{ max_signatures: props.max_signatures }}
        />
      );
    } else if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    }
    return error;
  };
  return _validateName;
};

export const validateLang = (value) => {
  let found = false;

  AVAILABLE_LANGUAGES.forEach((lang) => {
    if (lang[0] === value) {
      found = true;
    }
  });
  if (!found) {
    return (
      <FormattedMessage
        defaultMessage="Unknown language"
        key="unknown-language"
      />
    );
  }
  return undefined;
};

const validateBody = (value) => {
  return undefined;
};

const validateSendsigned = (value) => {
  return undefined;
};

const validateSkipfinal = (value) => {
  return undefined;
};

const validateOrdered = (value) => {
  return undefined;
};

export const validateNewname = (props) => {
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

const validate = (props) => {
  return (values) => {
    let errors = {};
    let emails = [];
    values.invitees.forEach((val, i) => {
      const nameError = validateName(props, i)(val.name);
      const emailError = validateEmail(props, values.invitees, i, {
        validate: true,
      })(val.email);
      const langError = validateLang(val.lang);
      if (nameError !== undefined) errors[`invitees.${i}.name`] = nameError;
      if (emailError !== undefined) {
        errors[`invitees.${i}.email`] = emailError;
      } else {
        if (emails.includes(val.email)) {
          const dupError = (
            <FormattedMessage
              defaultMessage="That email has already been invited"
              key="email-problem-dup"
            />
          );
          errors[`invitees.${i}.email`] = dupError;
        } else {
          emails.push(val.email);
        }
      }
      if (langError !== undefined) errors[`invitees.${i}.lang`] = langError;
    });
    if (values.makecopyChoice) {
      const newNameError = validateNewname(props)(values.newnameInput);
      if (newNameError !== undefined) errors.newnameInput = newNameError;
    }
    return errors;
  };
};

const initialValues = (props) => {
  const values = {
    invitationText: "",
    sendsignedChoice: props.ui_defaults.send_signed,
    skipfinalChoice: props.ui_defaults.skip_final,
    makecopyChoice: false,
    isTemplate: props.isTemplate,
    newnameInput: nameForCopy(props),
    loa: "low",
    documentId: props.docId,
    orderedChoice: props.ui_defaults.ordered_invitations,
    invitees: [
      {
        name: "",
        email: "",
        lang: Cookies.get("lang") || "en",
        id: "id0",
      },
    ],
  };
  return values;
};

const mapStateToProps = (state, props) => {
  let ordered;
  if (state.inviteform.ordered === null) {
    ordered = state.main.ui_defaults.ordered_invitations;
  } else {
    ordered = state.inviteform.ordered;
  }
  return {
    ordered: ordered,
  };
};

function _InviteesControl(props) {
  const fprops = useFormikContext();
  const arrayHelpers = props.arrayHelpers;
  const index = props.index;
  const invitee = props.invitee;
  return (
    <>
      {index > 0 && (
        <div className={"invitee-form-dismiss " + props.ordered}>
          <ESTooltip
            helpId={"button-remove-entry-" + index}
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
                  document.getElementById("invitation-text-input").focus();
                  document.getElementById("invitation-text-input").blur();
                }, 0);
              }}
            >
              ×
            </BButton>
          </ESTooltip>
        </div>
      )}
      <Field name="id" value={`invitees.${index}.id`} type="hidden" />
      <div className="invitee-form-row" key={index}>
        <div className="invitee-form-name">
          <BForm.Group className="form-group">
            <BForm.Label htmlFor={`invitees.${index}.name`}>
              <FormattedMessage defaultMessage="Name" key="name-input-field" />
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
              validate={validateName(props, index)}
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
              validate={validateEmail(
                props,
                [...fprops.values.invitees],
                index,
                fprops.status
              )}
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
            <BForm.Label htmlFor={`invitees.${index}.lang`}>
              <FormattedMessage
                defaultMessage="Language"
                key="language-input-field"
              />
            </BForm.Label>
            <ErrorMessage
              name={`invitees.${index}.lang`}
              component="div"
              className="field-error"
            />
            <Field
              name={`invitees.${index}.lang`}
              data-testid={`invitees.${index}.lang`}
              value={invitee.lang}
              as={BForm.Select}
              validate={validateLang}
              isValid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].lang &&
                (!fprops.errors.invitees ||
                  (fprops.errors.invitees &&
                    (!fprops.errors.invitees[index] ||
                      (fprops.errors.invitees[index] &&
                        !fprops.errors.invitees[index].lang))))
              }
              isInvalid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].lang &&
                fprops.errors.invitees &&
                fprops.errors.invitees[index] &&
                fprops.errors.invitees[index].lang
              }
            >
              {AVAILABLE_LANGUAGES.map((lang, i) => (
                <option key={i} value={lang[0]}>
                  {lang[1]}
                </option>
              ))}
            </Field>
          </BForm.Group>
        </div>
      </div>
    </>
  );
}

const InviteesControl = connect(mapStateToProps)(_InviteesControl);

function _InviteesArrayOrdered(props) {
  const fprops = useFormikContext();
  return (
    <FieldArray
      name="invitees"
      validateOnChange={true}
      data-dummy={`dummy-${props.ordered}`}
    >
      {(arrayHelpers) => (
        <>
          <DragDropContext
            onBeforeCapture={() => {
              fprops.setStatus({ validate: false });
            }}
            onDragEnd={(result) => {
              if (!result.destination) {
                fprops.setStatus({ validate: true });
                return;
              }
              arrayHelpers.move(result.source.index, result.destination.index);
              fprops.setStatus({ validate: true });
            }}
          >
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {fprops.values.invitees.length > 0 &&
                    fprops.values.invitees.map((invitee, index) => (
                      <Draggable
                        key={invitee.id}
                        draggableId={invitee.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            data-dummy={`dummy-${props.ordered}`}
                            className="invitation-fields"
                            key={index}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <InviteesControl
                              invitee={invitee}
                              index={index}
                              arrayHelpers={arrayHelpers}
                              {...props}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {props.button(arrayHelpers)}
        </>
      )}
    </FieldArray>
  );
}

const InviteesArrayOrdered = connect(mapStateToProps)(_InviteesArrayOrdered);

function _InviteesArray(props) {
  const fprops = useFormikContext();
  return (
    <FieldArray
      name="invitees"
      validateOnChange={true}
      data-dummy={`dummy-${props.ordered}`}
    >
      {(arrayHelpers) => (
        <>
          <div>
            {fprops.values.invitees.length > 0 &&
              fprops.values.invitees.map((invitee, index) => (
                <div
                  data-dummy={`dummy-${props.ordered}`}
                  className="invitation-fields"
                  key={index}
                >
                  <InviteesControl
                    invitee={invitee}
                    index={index}
                    arrayHelpers={arrayHelpers}
                    {...props}
                  />
                </div>
              ))}
          </div>
          {props.button(arrayHelpers)}
        </>
      )}
    </FieldArray>
  );
}

const InviteesArray = connect(mapStateToProps)(_InviteesArray);

function _InviteesWidget(props) {
  const [n_invites, setNInvites] = useState(1);
  const fprops = useFormikContext();
  const button = (arrayHelpers) => (
    <ESTooltip
      helpId={"button-add-invitation-" + props.docName}
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
        data-testid={"button-add-invitation-" + props.docName}
        onClick={() => {
          arrayHelpers.push({
            name: "",
            email: "",
            lang: Cookies.get("lang") || "en",
            id: `id${n_invites}`,
          });
          setNInvites(n_invites + 1);
        }}
      >
        <FormattedMessage
          defaultMessage="Invite more people"
          key="add-invite"
        />
      </Button>
    </ESTooltip>
  );
  return (
    <div className={`dummy-div-${props.ordered}`}>
      {(props.ordered && (
        <InviteesArrayOrdered button={button} {...props} />
      )) || <InviteesArray button={button} {...props} />}
    </div>
  );
}

const InviteesWidget = connect(mapStateToProps)(_InviteesWidget);

class InviteForm extends React.Component {
  shouldComponentUpdate(nextProps) {
    return !nextProps.inviting;
  }

  render() {
    const skipFinalControl = (
      <div className="skipfinal-choice-holder">
        <BForm.Group className="skipfinal-choice-group form-group">
          <ESTooltip
            helpId="skipfinal-choice-input"
            inModal={true}
            tooltip={
              <FormattedMessage
                defaultMessage="Finalize the signature flow automatically after the last person invited responds to the invitation."
                key="skipfinal-choice-help"
              />
            }
          >
            <BForm.Label
              className="skipfinal-choice-label"
              htmlFor="skipfinal-choice-input"
            >
              <FormattedMessage
                defaultMessage="Finalise signature flow automatically"
                key="skipfinal-choice-field"
              />
            </BForm.Label>
          </ESTooltip>
          <Field
            name="skipfinalChoice"
            id="skipfinal-choice-input"
            data-testid="skipfinal-choice-input"
            className="skipfinal-choice"
            validate={validateSkipfinal}
            type="checkbox"
          />
        </BForm.Group>
      </div>
    );
    const sendsignedControl = (
      <div className="sendsigned-choice-holder">
        <BForm.Group className="sendsigned-choice-group form-group">
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
    const orderedControl = (fprops) => {
      return (
        <div className="ordered-choice-holder">
          <BForm.Group className="ordered-choice-group form-group">
            <ESTooltip
              helpId="ordered-choice-input"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Ask for invited signatures in the given order."
                  key="ordered-choice-help"
                />
              }
            >
              <BForm.Label
                className="ordered-choice-label"
                htmlFor="ordered-choice-input"
              >
                <FormattedMessage
                  defaultMessage="Invited signatures in order"
                  key="ordered-choice-field"
                />
              </BForm.Label>
            </ESTooltip>
            <Field
              name="orderedChoice"
              id="ordered-choice-input"
              data-testid="ordered-choice-input"
              className="ordered-choice"
              validate={validateOrdered}
              type="checkbox"
              onChange={(e) => {
                fprops.setFieldValue("orderedChoice", e.target.checked);
                this.props.handleSetOrdered(e.target.checked);
                fprops.validateForm();
              }}
            />
          </BForm.Group>
        </div>
      );
    };
    const makecopyControl = (props) => {
      if (!props.isTemplate) {
        return <Field name="makecopyChoice" value={false} type="hidden" />;
      } else {
        return <Field name="makecopyChoice" value={true} type="hidden" />;
      }
    };
    const loaControl = (
      <>
        <div className="loa-select-holder">
          <BForm.Group className="loa-select-group form-group">
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
                      value={level.value}
                      className="loa-select"
                      type="radio"
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
      if (props.isTemplate) {
        return (
          <>
            <div className="newname-text-holder">
              <BForm.Group className="newname-text-group form-group">
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
                  isInvalid={!props.inviting && fprops.errors.newnameInput}
                />
              </BForm.Group>
            </div>
          </>
        );
      } else {
        return <Field name="newnameInput" value="" type="hidden" />;
      }
    };
    const loaControlHidden = <Field name="loa" value="low" type="hidden" />;
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
                    <BForm.Group className="invitation-text-group form-group">
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
                  {skipFinalControl}
                  {orderedControl(fprops)}
                  {makecopyControl(this.props)}
                  {newNameControl(this.props, fprops)}
                  {loaControl}
                  <InviteesWidget {...this.props} />
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
                      onClick={this.props.handleCloseResetting(
                        fprops.resetForm
                      )}
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
