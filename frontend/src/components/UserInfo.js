import React, { useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "containers/Button";
import { FormattedMessage } from "react-intl";
import { ESTooltip } from "containers/Overlay";
import "styles/UserInfo.scss";
import { useAppDispatch, useAppSelector } from "init-app/hooks";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { hideUserInfo } from "slices/UserInfo";

function UserInfo() {
  const dispatch = useAppDispatch();
  const show = useAppSelector((state) => state.userinfo.show);
  const attrs = useAppSelector((state) => state.main.signer_attributes) ?? {};
  const detailString = useAppSelector((state) => state.main.user_info_detail);
  const details = useMemo(
    () => (detailString ?? "").split(","),
    [detailString],
  );

  const {
    name: display_name,
    eppn,
    mail,
    mail_aliases,
    identity_provider,
    assurance_levels,
    authn_context,
  } = attrs;

  const handleClose = () => {
    dispatch(unsetSpinning());
    dispatch(enablePolling());
    dispatch(hideUserInfo());
  };

  return (
    <Modal show={show} onHide={handleClose} keyboard={false} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FormattedMessage
            defaultMessage={`User information.`}
            key="user-info-modal"
          />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="user-info-holder">
          {details.includes("display_name") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Display name"}
                  key="user-info-display-name"
                />
              </div>
              <div className="user-attr-value-holder">{display_name}</div>
            </div>
          )}
          {details.includes("mail") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Mail"}
                  key="user-info-mail"
                />
              </div>
              <div className="user-attr-value-holder">{mail}</div>
            </div>
          )}
          {details.includes("mail_aliases") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Mail aliases"}
                  key="user-info-mail-aliases"
                />
              </div>
              <div className="user-attr-value-holder">
                <div className="user-attr-value-list-holder">
                  {mail_aliases.map((alias, i) => (
                    <div className="user-attr-value-list-item" key={i}>
                      {alias}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {details.includes("idp") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Identity Provider"}
                  key="user-info-identity-provider"
                />
              </div>
              <div className="user-attr-value-holder">{identity_provider}</div>
            </div>
          )}
          {details.includes("eppn") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"User identity"}
                  key="user-info-user-identity"
                />
              </div>
              <div className="user-attr-value-holder">{eppn}</div>
            </div>
          )}
          {details.includes("loa") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Assurance levels"}
                  key="user-info-assurance-levels"
                />
              </div>
              <div className="user-attr-value-holder">
                <div className="user-attr-value-list-holder">
                  {assurance_levels.map((level, i) => (
                    <div className="user-attr-value-list-item" key={i}>
                      {level}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {details.includes("authn_context") && (
            <div className="user-attr-holder">
              <div className="user-attr-name-holder">
                <FormattedMessage
                  defaultMessage={"Authn Context"}
                  key="user-info-authn-context"
                />
              </div>
              <div className="user-attr-value-holder">{authn_context}</div>
            </div>
          )}
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
          <Button variant="outline-secondary" size="lg" onClick={handleClose}>
            <FormattedMessage
              defaultMessage="Close"
              key="close-user-info-label"
            />
          </Button>
        </ESTooltip>
      </Modal.Footer>
    </Modal>
  );
}

export default UserInfo;
