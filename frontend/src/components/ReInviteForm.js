import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

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
          onSubmit={async (values) => {
            await this.props.handleSubmit(values, this.props);
            this.props.handleClose();
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
                      defaultMessage={`Send reminders to people pending to sign {docName}`}
                      key="re-invite-people"
                      values={{ docName: this.props.doc.name }}
                    />
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="re-invitation-text-holder">
                    <BForm.Group className="re-invitation-text-group form-group">
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
                  <ESTooltip
                    helpId={"button-cancel-resend-" + this.props.doc.name}
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
                      data-testid={
                        "button-cancel-resend-" + this.props.doc.name
                      }
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-invite"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    helpId={"button-resend-" + this.props.doc.name}
                    inModal={true}
                    tooltip={
                      <FormattedMessage
                        defaultMessage="Resend invitations to sign to invitees pending to sign"
                        key="resend-invitation-tootip"
                      />
                    }
                  >
                    <Button
                      variant="outline-success"
                      onClick={fprops.submitForm}
                      id={"button-resend-" + this.props.doc.name}
                      disabling={true}
                      disabled={!fprops.isValid}
                      data-testid={"button-resend-" + this.props.doc.name}
                    >
                      <FormattedMessage
                        defaultMessage="Resend"
                        key="resend-invite"
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

ReInviteForm.propTypes = {
  show: PropTypes.bool,
  size: PropTypes.string,
  doc: PropTypes.object,
  handleClose: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(ReInviteForm);
