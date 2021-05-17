import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage } from "react-intl";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import "styles/ReInviteForm.scss";

const initialValues = (docId) => ({
  invitationText: "",
  documentId: docId,
});

class ReInviteForm extends React.Component {
  render() {
    return (
      <>
        <Formik
          initialValues={initialValues(this.props.doc.key)}
          enableReinitialize={true}
          onSubmit={(values) => {
            this.props.handleClose();
            this.props.handleSubmit(values);
          }}
        >
          {(fprops) => (
            <Modal
              show={this.props.show}
              onHide={this.props.handleClose}
              size={this.props.size}
            >
              <Form data-testid={"re-invite-form-" + this.props.doc.name}>
                <Field
                  type="hidden"
                  name="documentId"
                  value={fprops.values.documentId}
                />
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FormattedMessage
                      defaultMessage={`Resend invitation to people pending to sign {docName}`}
                      key="re-invite-people"
                      values={{ docName: this.props.doc.name }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="re-invitation-text-holder">
                    <BForm.Group className="re-invitation-text-group">
                      <BForm.Label
                        className="re-invitation-text-label"
                        htmlFor="re-invitation-text-input"
                      >
                        <FormattedMessage
                          defaultMessage="Add a message to send to all invitees pending to sign"
                          key="re-invitation-text-field"
                        />
                      </BForm.Label>
                      <Field
                        name="re-invitationText"
                        data-testid="re-invitation-text-input"
                        className="re-invitation-text"
                        as="textarea"
                      />
                    </BForm.Group>
                  </div>
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
                          defaultMessage="Resend invitations to sign to invitees pending to sign"
                          key="resend-invitation-tootip"
                        />
                      </Tooltip>
                    )}
                  >
                    <Button variant="outline-success" type="submit">
                      <FormattedMessage
                        defaultMessage="Resend"
                        key="resend-invite"
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

ReInviteForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  doc: PropTypes.object,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default ReInviteForm;
