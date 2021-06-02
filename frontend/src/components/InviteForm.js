import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import "styles/InviteForm.scss";

const validateEmail = (value) => {
  let error;

  if (!value) {
    error = <FormattedMessage defaultMessage="Required" key="required-field" />;
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
    error = (
      <FormattedMessage defaultMessage="Invalid email" key="invalid-email" />
    );
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

const initialValues = (docId) => ({
  invitationText: "",
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
    return (
      <>
        <Formik
          initialValues={initialValues(this.props.docId)}
          enableReinitialize={true}
          onSubmit={function (values) {
            this.props.handleClose();
            this.props.handleSubmit(values, this.props);
          }.bind(this)}
        >
          {(fprops) => (
            <Modal
              show={this.props.show}
              onHide={this.props.handleClose}
              size={this.props.size}
            >
              <Form data-testid={"invite-form-" + this.props.docName}>
                <Field
                  type="hidden"
                  name="documentId"
                  value={fprops.values.documentId}
                />
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Invite people to sign {docName}`}
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
                        data-testid="invitation-text-input"
                        className="invitation-text"
                        as="textarea"
                      />
                    </BForm.Group>
                  </div>
                  <FieldArray name="invitees">
                    {(arrayHelpers) => (
                      <div>
                        {fprops.values.invitees.length > 0 &&
                          fprops.values.invitees.map((invitee, index) => (
                            <div className="invitation-fields">
                              <div className="invitee-form-dismiss">
                                <OverlayTrigger
                                  trigger={["hover", "focus"]}
                                  rootClose={true}
                                  overlay={(props) => (
                                    <Tooltip
                                      id="tooltip-rm-invitation"
                                      {...props}
                                    >
                                      <FormattedMessage
                                        defaultMessage="Remove this entry from invitation"
                                        key="rm-invitation-tootip"
                                      />
                                    </Tooltip>
                                  )}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => arrayHelpers.remove(index)}
                                  >
                                    ×
                                  </Button>
                                </OverlayTrigger>
                              </div>
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
                                      validate={validateEmail}
                                    />
                                  </BForm.Group>
                                </div>
                              </div>
                            </div>
                          ))}
                        <OverlayTrigger
                          trigger={["hover", "focus"]}
                          rootClose={true}
                          overlay={(props) => (
                            <Tooltip id="tooltip-add-invitation" {...props}>
                              <FormattedMessage
                                defaultMessage="Invite one more person to sign this document"
                                key="add-invitation-tootip"
                              />
                            </Tooltip>
                          )}
                        >
                          <Button
                            variant="outline-secondary"
                            data-testid={"button-add-invitation-" + this.props.docName}
                            onClick={() =>
                              arrayHelpers.push({ name: "", email: "" })
                            }
                          >
                            <FormattedMessage
                              defaultMessage="Add Invitation"
                              key="add-invite"
                            />
                          </Button>
                        </OverlayTrigger>
                      </div>
                    )}
                  </FieldArray>
                </Modal.Body>
                <Modal.Footer>
                  <OverlayTrigger
                    trigger={["hover", "focus"]}
                    rootClose={true}
                    overlay={(props) => (
                      <Tooltip id="tooltip-cancel-invitation" {...props}>
                        <FormattedMessage
                          defaultMessage="Dismiss invitation form"
                          key="cancel-invitation-tootip"
                        />
                      </Tooltip>
                    )}
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
                  </OverlayTrigger>
                  <OverlayTrigger
                    trigger={["hover", "focus"]}
                    rootClose={true}
                    overlay={(props) => (
                      <Tooltip id="tooltip-send-invitation" {...props}>
                        <FormattedMessage
                          defaultMessage="Send invitations to sign to indicated people"
                          key="send-invitation-tootip"
                        />
                      </Tooltip>
                    )}
                  >
                    <Button
                      variant="outline-success"
                      type="submit"
                      data-testid={"button-send-invites-" + this.props.docName}
                    >
                      <FormattedMessage
                        defaultMessage="Invite"
                        key="send-invite"
                      />
                    </Button>
                  </OverlayTrigger>
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
