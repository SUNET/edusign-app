/**
 * @module containers/Owned
 * @desc In this module we connect the Owned component with the Redux store.
 *
 */
import { connect } from "react-redux";

import { removeInvites } from "slices/Invitations";
import Owned from "components/Owned";
import { askConfirmation } from "slices/ConfirmDialog";
import { showResend, showEditInvitationForm } from "slices/Modals";
import {
  getPartiallySignedDoc,
  hideOwnedPreview,
  selectOwnedDoc,
} from "slices/Main";
import { disablePolling, enablePolling, poll } from "slices/Poll";
import { skipOwnedSignature } from "slices/Documents";
import { unsetSpinning } from "slices/Button";
import { setActiveId, unsetActiveId } from "slices/Overlay";

const mapStateToProps = (state) => {
  return {
    owned: state.main.owned_multisign,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDocSelection: function (docName, docKey) {
      return () => {
        dispatch(selectOwnedDoc(docKey));
      };
    },
    handleRemove: function (doc, props) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(removeInvites({ doc: doc, intl: props.intl }));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleSkipSigning: function (doc, props) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(skipOwnedSignature({ doc: doc, intl: props.intl }));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleResend: function (doc) {
      return () => {
        dispatch(showResend(doc));
      };
    },
    showConfirm: function (confirmId) {
      return () => {
        dispatch(setActiveId("dummy-help-id"));
        dispatch(askConfirmation(confirmId));
      };
    },
    openEditInvitationForm: function (doc, props) {
      return async () => {
        await dispatch(poll());
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        dispatch(
          showEditInvitationForm({
            key: doc.key,
            form_id: doc.key + "-edit-invitations",
            intl: props.intl,
          }),
        );
        dispatch(unsetSpinning());
      };
    },
    handlePreview: (docKey) => {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(
          getPartiallySignedDoc({
            key: docKey,
            stateKey: "owned_multisign",
            intl: props.intl,
            show: true,
            showForced: false,
          }),
        );
        dispatch(unsetSpinning());
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(enablePolling());
        dispatch(unsetSpinning());
        dispatch(hideOwnedPreview(docKey));
        dispatch(unsetActiveId());
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Owned);
