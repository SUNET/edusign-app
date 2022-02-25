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
  declineSigning,
  downloadInvitedSigned,
  startDelegating,
} from "slices/Main";
import { disablePolling, enablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {
    invited: state.main.pending_multisign,
    size: state.main.size,
    name: state.main.signer_attributes.name,
    mail: state.main.signer_attributes.mail,
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
    handlePreview: (docKey) => {
      return async () => {
        dispatch(disablePolling());
        await dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
          })
        );
        dispatch(unsetSpinning());
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideInvitedPreview(docKey));
      };
    },
    handleForcedPreview: function (docKey) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
            showForced: true,
          })
        );
        dispatch(unsetSpinning());
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleConfirmForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(confirmForcedInvitedPreview(name));
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleUnConfirmForcedPreview: function (args) {
      return async () => {
        await dispatch(
          declineSigning({
            key: args.doc.key,
            intl: args.intl,
          })
        );
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(args.doc.name));
      };
    },
    handleDeclineSigning: function (args) {
      return async () => {
        await dispatch(
          declineSigning({
            key: args.doc.key,
            intl: args.intl,
          })
        );
        dispatch(unsetSpinning());
      };
    },
    handleDlSigned: function (name) {
      return async () => {
        await dispatch(downloadInvitedSigned(name));
        dispatch(unsetSpinning());
      };
    },
    handleDelegateSigning: function (key) {
      return async () => {
        dispatch(disablePolling());
        dispatch(startDelegating(key));
        dispatch(unsetSpinning());
      };
    },
    //handleCloseDelegateForm: function () {},
    //handleSubmitDelegateForm: function () {},
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Invited);
