/**
 * @module containers/Owned
 * @desc In this module we connect the Owned component with the Redux store.
 *
 */
import { connect } from "react-redux";

import { removeInvites, signInvitedDoc } from "slices/Documents";
import Owned from "components/Owned";
import { askConfirmation } from "slices/ConfirmDialog";
import { showResend } from "slices/Modals";
import {
  getPartiallySignedDoc,
  hideOwnedPreview,
  setOwnedSigning,
  selectOwnedDoc,
} from "slices/Main";
import { disablePolling, enablePolling } from "slices/Poll";
import { skipOwnedSignature } from "slices/Documents";

const mapStateToProps = (state) => {
  return {
    owned: state.main.owned_multisign,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDocSelection: function (docName) {
      return () => {
        dispatch(selectOwnedDoc(docName));
      };
    },
    handleRemove: function (doc, props) {
      return async () => {
        await dispatch(removeInvites({ doc: doc, intl: props.intl }));
      };
    },
    handleSign: function (doc, props) {
      return async () => {
        dispatch(setOwnedSigning(doc.key));
        await dispatch(signInvitedDoc({ doc: doc, intl: props.intl }));
      };
    },
    handleSkipSigning: function (doc, props) {
      return async () => {
        await dispatch(skipOwnedSignature({ doc: doc, intl: props.intl }));
      };
    },
    handleResend: function (doc) {
      return () => {
        dispatch(showResend(doc));
      };
    },
    showConfirm: function (confirmId) {
      return () => {
        dispatch(askConfirmation(confirmId));
      };
    },
    handlePreview: (docKey) => {
      return () => {
        dispatch(disablePolling());
        dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "owned_multisign",
            intl: props.intl,
          })
        );
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(enablePolling());
        dispatch(hideOwnedPreview(docKey));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Owned);
