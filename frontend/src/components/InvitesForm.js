
import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Formik, Field, Form, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage } from "react-intl";


const InviteForm = (props) => {

  return (
    <Formik
      initialValues={props.invites}
      onSubmit={(values) => {
        props.handleSendInvites(props.docId, values)
      }}
    >
      {({ values }) => (
      <Form>
        <Modal show={props.show} onHide={() => {
                                    props.handleSoftClose(values);
                                  }}>
          <Modal.Header closeButton>
            <Modal.Title>
              <FormattedMessage
                defaultMessage="Invite people to sign document"
                key="invite-people"
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FieldArray name="invites">
              {({ insert, remove, push }) => (
                <div>
                  {values.length > 0 &&
                    values.map((invite, index) => (
                      <div className="row" key={index}>
                        <div className="col">
                          <label htmlFor={invite.name}>Name</label>
                          <Field
                            name={invite.name}
                            placeholder="Jane Doe"
                            type="text"
                          />
                          <ErrorMessage
                            name={invite.name}
                            component="div"
                            className="field-error"
                          />
                        </div>
                        <div className="col">
                          <label htmlFor={invite.email}>Email</label>
                          <Field
                            name={invite.email}
                            placeholder="jane@acme.com"
                            type="email"
                          />
                          <ErrorMessage
                            name={invite.name}
                            component="div"
                            className="field-error"
                          />
                        </div>
                        <div className="col">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => remove(index)}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  <Button
                    variant="secondary"
                    onClick={() => push({ name: '', email: '' })}
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
            <Button variant="secondary" onClick={props.handleHardClose}>
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
        </Modal>
      </Form>
      )}
    </Formik>
)};


InviteForm.propTypes = {
  show: PropTypes.bool,
  handleSoftClose: PropTypes.func,
  handleHardClose: PropTypes.func,
  handleSendInvites: PropTypes.func,
};

export default InviteForm;
