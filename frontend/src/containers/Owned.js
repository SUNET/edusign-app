/**
 * @module containers/Owned
 * @desc In this module we connect the Owned component with the Redux store.
 *
 */
import { connect } from "react-redux";

import { removeInvites, signInvitedDoc, resendInvitations } from "slices/Documents";
import Owned from "components/Owned";
import { askConfirmation } from "slices/ConfirmDialog";

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
    showConfirm: function (confirmId) {
      return () => {
        dispatch(askConfirmation(confirmId));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Owned);
