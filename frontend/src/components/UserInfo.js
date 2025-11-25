import React from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import { FormattedMessage, injectIntl } from "react-intl";
import { ESTooltip } from "containers/Overlay";

import "styles/UserInfo.scss";



class UserInfo extends React.Component {

  render() {
    return (
      <>
        <Modal
          show={this.props.show}
          onHide={this.props.handleClose}
          keyboard={false}
          size="lg"
          backdrop="static"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FormattedMessage
                defaultMessage={`Info for user: {displayName}`}
                key="user-info-modal"
                values={{ displayName: this.props.display_name }}
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="user-info-holder">
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Display name'}
                    key="user-info-display-name"
                  />
                </div>
                <div className="user-attr-value-holder">
                  {this.props.display_name}
                </div>
              </div>
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Mail'}
                    key="user-info-mail"
                  />
                </div>
                <div className="user-attr-value-holder">
                  {this.props.mail}
                </div>
              </div>
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Mail aliases'}
                    key="user-info-mail-aliases"
                  />
                </div>
                <div className="user-attr-value-holder">
                  <div className="user-attr-value-list-holder">
                    {this.props.mail_aliases.map(alias => (
                      <div className="user-attr-value-list-item">{alias}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Identity Provider'}
                    key="user-info-identity-provider"
                  />
                </div>
                <div className="user-attr-value-holder">
                  {this.props.identity_provider}
                </div>
              </div>
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Assurance levels'}
                    key="user-info-assurance-levels"
                  />
                </div>
                <div className="user-attr-value-holder">
                  <div className="user-attr-value-list-holder">
                    {this.props.assurance_levels.map(level => (
                      <div className="user-attr-value-list-item">{level}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="user-attr-holder">
                <div className="user-attr-name-holder">
                  <FormattedMessage
                    defaultMessage={'Authn Context'}
                    key="user-info-authn-context"
                  />
                </div>
                <div className="user-attr-value-holder">
                  {this.props.authn_context}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <ESTooltip
              helpId="button-close-user-info"
              inModal={true}
              tooltip={
                <FormattedMessage
                  defaultMessage="Close User Info Popup"
                  key="close-user-info-help"
                />
              }
            >
              <Button
                variant="outline-secondary"
                onClick={this.props.handleClose}
              >
                <FormattedMessage
                  defaultMessage="Close"
                  key="close-user-info-label"
                />
              </Button>
            </ESTooltip>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

UserInfo.propTypes = {
  show: PropTypes.bool,
};

export default injectIntl(UserInfo);

