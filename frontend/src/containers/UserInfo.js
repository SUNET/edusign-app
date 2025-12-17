import { connect } from "react-redux";

import UserInfo from "components/UserInfo";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { hideUserInfo } from "slices/UserInfo";

const mapStateToProps = (state) => {
  return {
    show: state.userinfo.show,
    display_name: state.main.signer_attributes.name,
    eppn : state.main.signer_attributes.eppn,
    mail: state.main.signer_attributes.mail,
    mail_aliases: state.main.signer_attributes.mail_aliases,
    identity_provider: state.main.signer_attributes.identity_provider,
    assurance_levels: state.main.signer_attributes.assurance_levels,
    authn_context: state.main.signer_attributes.authn_context,
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

export default connect(mapStateToProps, mapDispatchToProps)(UserInfo);
