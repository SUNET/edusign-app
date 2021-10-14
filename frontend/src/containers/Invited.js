/**
 * @module containers/Invited
 * @desc In this module we connect the Invited component with the Redux store.
 *
 */
import { connect } from "react-redux";

import Invited from "components/Invited";
import {
  getPartiallySignedDoc,
  hideInvitedPreview,
  setInvitedSigning,
  selectInvitedDoc,
  showForcedInvitedPreview,
  hideForcedInvitedPreview,
  confirmForcedInvitedPreview,
} from "slices/Main";

const mapStateToProps = (state) => {
  return {
    invited: state.main.pending_multisign,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDocSelection: function (docName) {
      return () => {
        dispatch(selectInvitedDoc(docName));
      };
    },
    startMultiSigning: (docRef) => {
      return () => {
        dispatch(setInvitedSigning(docRef));
        window.document.location.href = "/sign/invitation/" + docRef;
      };
    },
    showPreview: (docKey) => {
      return () => {
        dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
          })
        );
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(hideInvitedPreview(docKey));
      };
    },
    handleForcedPreview: function (name) {
      return () => {
        dispatch(showForcedInvitedPreview(name));
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleConfirmForcedPreview: function (name) {
      return async () => {
        dispatch(confirmForcedInvitedPreview(name));
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleUnConfirmForcedPreview: function (name) {
      return async () => {
        dispatch(hideForcedInvitedPreview(name));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Invited);
