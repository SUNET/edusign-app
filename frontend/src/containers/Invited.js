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
  hideForcedInvitedPreview,
  confirmForcedInvitedPreview,
  declineSigning,
  downloadInvitedDraft,
  startDelegating,
} from "slices/Main";
import { disablePolling, enablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";
import { setActiveId, unsetActiveId } from "slices/Overlay";
import { getLocation } from "slices/fetch-utils";

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
        window.document.location.href = getLocation(
          `/sign/invitation/${docRef}`,
        );
      };
    },
    handlePreview: (docKey) => {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
            showForced: false,
            show: true,
          }),
        );
        dispatch(unsetSpinning());
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideInvitedPreview(docKey));
        dispatch(unsetActiveId());
      };
    },
    handleForcedPreview: function (docKey) {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "pending_multisign",
            intl: props.intl,
            showForced: true,
            show: false,
          }),
        );
        dispatch(unsetSpinning());
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(name));
        dispatch(unsetActiveId());
      };
    },
    handleConfirmForcedPreview: function (name) {
      return () => {
        dispatch(enablePolling());
        dispatch(confirmForcedInvitedPreview(name));
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(name));
        dispatch(unsetActiveId());
      };
    },
    handleUnConfirmForcedPreview: function (args) {
      return async () => {
        await dispatch(
          declineSigning({
            key: args.doc.key,
            intl: args.intl,
          }),
        );
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideForcedInvitedPreview(args.doc.name));
        dispatch(unsetActiveId());
      };
    },
    handleDeclineSigning: function (args) {
      return async () => {
        await dispatch(
          declineSigning({
            key: args.doc.key,
            intl: args.intl,
          }),
        );
        dispatch(unsetSpinning());
      };
    },
    handleDlDraft: function (args) {
      return async () => {
        await dispatch(downloadInvitedDraft(args));
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
