import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";

import "styles/Invited.scss";


const signButton = (props, doc) => {
  return (
    <>
      <div className="button-sign-container">
        <div className="button-sign-invitation">
          <Button
            variant="outline-success"
            size="sm"
            onClick={props.startMultiSigning(doc.invite_key)}
          >
            <FormattedMessage
              defaultMessage="Sign"
              key="sign-button"
            />
          </Button>
        </div>
      </div>
    </>
  );
};

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Invited extends Component {
  render() {
    if (this.props.invited.length === 0) return "";
    return (
      <>
        <div className="multisign-title">
          <FormattedMessage
            defaultMessage="Invitations to sign:"
            key="invitations-to-sign"
          />
        </div>
        {this.props.invited.map((doc, index) => {
          return (
            <div className="invited-multisign">
              <div
                className="invited-multisign-request"
                key={index}
              >
                <div className="name-flex-item">{doc.name}</div>
                <div className="invited-flex-item">
                  <div className="invited-flex-label">
                    <FormattedMessage
                      defaultMessage="Invited by"
                      key="invited-by"
                    />
                  </div>
                  <div className="owner-flex-item">
                    {doc.owner.name} &lt;{doc.owner.email}&gt;
                  </div>
                </div>
                {signButton(this.props, doc)}
              </div>
            </div>
          );
        })}
      </>
    );
  }
}

Invited.propTypes = {
  owned: PropTypes.array,
};

export default Invited;
