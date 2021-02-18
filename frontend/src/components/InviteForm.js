
import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Formik, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage } from "react-intl";


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
                            <div className="col">
                              <label htmlFor={`invitees.${index}.name`}>Name</label>
                              <Field
                                name={`invitees.${index}.name`}
                                value={invitee.name}
                                placeholder="Jane Doe"
                                type="text"
                                onChange={(e) => {fprops.handleSubmit(e); fprops.handleChange(e)}}
                              />
                              <ErrorMessage
                                name={`invitees.${index}.name`}
                                component="div"
                                className="field-error"
                              />
                            </div>
                            <div className="col">
                              <label htmlFor={`invitees.${index}.email`}>Email</label>
                              <Field
                                name={`invitees.${index}.email`}
                                value={invitee.email}
                                placeholder="jane@acme.com"
                                type="email"
                                onChange={(e) => {fprops.handleSubmit(e); fprops.handleChange(e)}}
                              />
                              <ErrorMessage
                                name={`invitees.${index}.email`}
                                component="div"
                                className="field-error"
                              />
                            </div>
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
