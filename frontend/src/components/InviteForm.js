import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import BForm from "react-bootstrap/Form";
import {
  Formik,
  Form,
  Field,
  ErrorMessage,
} from "formik";
import { FormattedMessage, injectIntl } from "react-intl";
import Cookies from "js-cookie";
import { ESTooltip } from "containers/Overlay";
import { InviteesWidget } from "components/InviteesWidget";
import { nameForCopy } from "components/utils";
import {
  validateEmail,
  validateName,
  validateLang,
  validateBody,
  validateSendsigned,
  validateSkipfinal,
  validateOrdered,
  validateNewname,
} from "components/validation";

import "styles/InviteForm.scss";

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
                  defaultMessage="Invited persons will be asked to sign document in a given order."
                  key="ordered-choice-help"
                />
              }
            >
              <BForm.Label
                className="ordered-choice-label"
                htmlFor="ordered-choice-input"
              >
                <FormattedMessage
                  defaultMessage="Use workflow for signatures"
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
            >
              <FormattedMessage
                defaultMessage="Security level for signatures"
                key="loa-select-field"
              />
            </BForm.Label>
            <div
              id="loa-select-field"
              data-testid="loa-select-field"
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
