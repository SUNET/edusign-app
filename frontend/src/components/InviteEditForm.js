import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import Cookies from "js-cookie";
import { ESTooltip } from "containers/Overlay";
import { InviteesWidget } from "components/InviteesWidget";
import { sendsignedControl, skipFinalControl } from "components/widgets";
import {
  validateEmail,
  validateName,
  validateLang,
} from "components/validation";

import "styles/InviteForm.scss";

const initialValues = (props) => {
  const vals = {
    documentKey: props.docKey,
    invitationText: "",
    sendsignedChoice: props.doc.sendsigned,
    skipfinalChoice: props.doc.skipfinal,
    invitees: [],
  };
  props.doc.pending.forEach((invite, i) => {
    vals.invitees.push({
      id: `id${i}`,
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

class InviteEditForm extends React.Component {
  render() {
    const formId = "invite-form-" + this.props.doc.name;
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
              onHide={this.props.handleCloseResetting(fprops.resetForm)}
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
                      values={{ docName: this.props.doc.name }}
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
                  {sendsignedControl}
                  {skipFinalControl}
                  <InviteesWidget parentForm="edit" {...this.props} />
                </Modal.Body>
                <Modal.Footer>
                  <ESTooltip
                    helpId="button-cancel-edit-form"
                    inModal={true}
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
                        fprops.resetForm,
                      )}
                    >
                      <FormattedMessage
                        defaultMessage="Cancel"
                        key="cancel-edit-invite"
                      />
                    </Button>
                  </ESTooltip>
                  <ESTooltip
                    helpId="button-save-edit-form"
                    inModal={true}
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
                      id={"button-save-edit-invitation-" + this.props.doc.name}
                      disabling={true}
                      disabled={!fprops.isValid}
                      data-testid={
                        "button-save-edit-invitation-" + this.props.doc.name
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
  docOrdered: PropTypes.bool,
  docSendSigned: PropTypes.bool,
  docSkipFinal: PropTypes.bool,
  handleCloseResetting: PropTypes.func,
  handleSubmit: PropTypes.func,
};

export default injectIntl(InviteEditForm);
