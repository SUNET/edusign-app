
import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Formik, Field, Form, ErrorMessage, FieldArray } from "formik";
import { FormattedMessage } from "react-intl";


const InviteForm = (props) => {

  return (
    <Formik>
      {(fprops) => (
      <Form>
        <Modal show={props.show}
               onHide={() => {props.handleClose()}}>
          <Modal.Header closeButton>
            <Modal.Title>
              <FormattedMessage
                defaultMessage="Invite people to sign document"
                key="invite-people"
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <span>hoh ho ho</span>
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
        </Modal>
      </Form>
      )}
    </Formik>
)};


InviteForm.propTypes = {
  show: PropTypes.bool,
};

export default InviteForm;
