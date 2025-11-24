import { connect } from "react-redux";

import UserInfo from "components/UserInfo";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { hideUserInfo } from "slices/UserInfo";

const mapStateToProps = (state) => {
  return {
    show: state.user_info.show,
    displayName: state.main.signer_attributes.name,
    eppn: state.main.signer_attributes.eppn,
    mail: state.main.signer_attributes.mail,
    mail_aliases: state.main.signer_attributes.mail_aliases,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleClose: () => {
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(hideUserInfo());
    },
  };
};

export const UserInfo = connect(mapStateToProps, mapDispatchToProps)(UserInfo);
