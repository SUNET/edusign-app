
import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Formik, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage } from "react-intl";


const validateEmail = (value) => {
  let error;

  if (!value) {
    error = <FormattedMessage defaultMessage="Required" key="required-field" />;
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
    error = <FormattedMessage defaultMessage="Invalid email" key="invalid-email" />;
  }
  return error;
};


const validateName = (value) => {
  let error;

  if (!value) {
    error = <FormattedMessage defaultMessage="Required" key="required-field" />;
  }
  return error;
};


const InviteForm = (props) => {

  return (
    <>
      {props.show && (
        <Modal show={props.show}
               onHide={() => {props.handleClose()}}>
          <Formik
            initialValues={{invitees: props.invitees}}
            onSubmit={(values) => {props.handleChange(values.invitees)}}
          >
            {(fprops) => (
            <form onSubmit={props.handleSubmit}>
              <Modal.Header closeButton>
                <Modal.Title>
                  <FormattedMessage
                    defaultMessage="Invite people to sign document"
                    key="invite-people"
                  />
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <FieldArray name="invitees">
                  {(arrayHelpers) => (
                    <div>
                      {fprops.values.invitees.length > 0 &&
                        fprops.values.invitees.map((invitee, index) => (
                          <div className="row" key={index}>

                            <Form.Group>
                              <Form.Label htmlFor={`invitees.${index}.name`}>
                                <FormattedMessage defaultMessage="Name" key="name-input-field" />
                              </Form.Label>
                              <Field
                                name={`invitees.${index}.name`}
                                data-testid={`invitees.${index}.name`}
                                value={invitee.name}
                                placeholder="Jane Doe"
                                as={Form.Control}
                                type="text"
                                validate={validateName}
                                onChange={(e) => {fprops.handleChange(e)}}
                              />
                              <ErrorMessage
                                name={`invitees.${index}.name`}
                                component="div"
                                className="field-error"
                              />
                            <Form.Group>
                            </Form.Group>
                              <Form.Label htmlFor={`invitees.${index}.email`}>
                                <FormattedMessage defaultMessage="Email" key="email-input-field" />
                              </Form.Label>
                              <Field
                                name={`invitees.${index}.email`}
                                data-testid={`invitees.${index}.email`}
                                value={invitee.email}
                                placeholder="jane@example.com"
                                as={Form.Control}
                                type="email"
                                validate={validateEmail}
                                onChange={(e) => {fprops.handleChange(e)}}
                              />
                              <ErrorMessage
                                name={`invitees.${index}.email`}
                                component="div"
                                className="field-error"
                              />
                            </Form.Group>
                            <div className="col">
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => arrayHelpers.remove(index)}
                              >
                                X
                              </button>
                            </div>
                          </div>
                        ))}
                      <Button
                        variant="secondary"
                        onClick={() => arrayHelpers.push({ name: '', email: '' })}
                      >
                        <FormattedMessage
                          defaultMessage="Add Invitation"
                          key="add-invite"
                        />
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => {props.handleClose()}}>
                  <FormattedMessage
                    defaultMessage="Cancel"
                    key="cancel-invite"
                  />
                </Button>
                <Button variant="primary" type="submit">
                  <FormattedMessage
                    defaultMessage="Send"
                    key="send-invite"
                  />
                </Button>
              </Modal.Footer>
            </form>
            )}
          </Formik>
        </Modal>
      )}
    </>
  )
};


InviteForm.propTypes = {
  show: PropTypes.bool,
};

export default InviteForm;
