/**
 * @module containers/Owned
 * @desc In this module we connect the Owned component with the Redux store.
 *
 */
import { connect } from "react-redux";

import { removeInvites, signInvitedDoc, resendInvitations } from "slices/Documents";
import Owned from "components/Owned";

const mapStateToProps = (state) => {
  return {
    owned: state.main.owned_multisign,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleRemove: function (doc) {
      return () => {
        dispatch(removeInvites(doc));
      };
    },
    handleSign: function (doc) {
      return async () => {
        await dispatch(signInvitedDoc(doc));
      };
    },
    handleResend: function (doc) {
      return async () => {
        await dispatch(resendInvitations(doc));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Owned);
