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
  disablePolling,
  enablePolling,
  declineSigning,
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
    handlePreview: (docKey) => {
      return () => {
        dispatch(disablePolling());
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
        dispatch(enablePolling());
        dispatch(hideInvitedPreview(docKey));
      };
    },
    handleForcedPreview: function (docKey) {
      return () => {
        dispatch(disablePolling());
        dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
            showForced: true,
          })
        );
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleConfirmForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(confirmForcedInvitedPreview(name));
        dispatch(hideForcedInvitedPreview(name));
      };
    },
    handleUnConfirmForcedPreview: function (args) {
      return () => {
        dispatch(declineSigning({
          key: args.doc.key,
          intl: args.intl,
        }));
        dispatch(enablePolling());
        dispatch(hideForcedInvitedPreview(args.doc.name));
      };
    },
    handleDeclineSigning: function (args) {
      return () => {
        dispatch(declineSigning({
          key: args.doc.key,
          intl: args.intl,
        }));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Invited);
