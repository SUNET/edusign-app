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
import { startSigningDoc } from "slices/Documents";
import { disablePolling, enablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";
import { setActiveId, unsetActiveId } from "slices/Overlay";
import { enableFastSignature } from "slices/FastSignature";
import { getLocation } from "slices/fetch-utils";

const mapStateToProps = (state) => {
  return {
    invited: state.main.pending_multisign,
    size: state.main.size,
    name: state.main.signer_attributes.name,
    mail: state.main.signer_attributes.mail,
    using_bankid: state.main.signer_attributes.using_bankid,
    using_freja: state.main.signer_attributes.using_freja,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDocSelection: function (docName, docKey) {
      return () => {
        dispatch(selectInvitedDoc(docKey));
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
    handleSendToSign: function(props, doc) {
      return async () => {
        await dispatch(startSigningDoc({ doc: doc, intl: props.intl }));
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
    handleConfirmForcedPreview: function (props) {
      return (doc) => {
        return async () => {
          dispatch(confirmForcedInvitedPreview(doc.key));
          dispatch(hideForcedInvitedPreview(doc.name));
          // Approving the preview never starts signing on its own. For every
          // signature method (including eID / BankID / Freja) we open the fast
          // signature modal, so the user has to click "Sign" to trigger signing.
          dispatch(enableFastSignature(doc.key));
        };
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
