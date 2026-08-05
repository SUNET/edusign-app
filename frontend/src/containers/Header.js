/**
 * @module containers/Header
 * @desc In this module we connect the Header component with the Redux store,
 *
 * In mapStateToProps we take some keys from the central store
 * and add them to the props of the component.
 *
 * in mapDispatchToProps we compose the handler to clear the IndexedDB store
 * of any documents it may hold.
 */
import { connect } from "react-redux";

import Header from "components/Header";
import { showUserInfo } from "slices/UserInfo";
import { disablePolling } from "slices/Poll";

const mapStateToProps = (state) => {
  // Users authenticated through BankID / Freja+ (invited eID signers)
  // have no SAML session: no greeting, no Logout button.
  const eid_session =
    state.main.signer_attributes != null &&
    (state.main.signer_attributes.using_bankid ||
      state.main.signer_attributes.using_freja);
  const common = {
    size: state.main.size,
    company_link: state.main.company_link,
    eid_session: eid_session,
  };
  if (state.main.signer_attributes == null) {
    return {
      loading: false,
      ...common,
    };
  } else {
    return {
      loading: false,
      signer_attributes: state.main.signer_attributes,
      ...common,
    };
  }
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleLogout: function () {
      document.location = "logout";
    },
    handleOpenUserInfo: function () {
      dispatch(disablePolling());
      dispatch(showUserInfo());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
