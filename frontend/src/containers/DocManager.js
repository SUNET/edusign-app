/**
 * @module containers/DocManager
 * @desc In this module we connect the DocManager component with the Redux store.
 *
 * In mapStateToProps we take a few keys from the central store
 * and assign them to the props of the component.
 *
 * in mapDispatchToProps we compose the event handlers making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import DocManager from "components/DocManager";
import {
  showForcedPreview,
  hideForcedPreview,
  confirmForcedPreview,
  prepareDocument,
  showPreview,
  hidePreview,
  setState,
  toggleDocSelection,
  startSigning,
  removeDocument,
  removeAllDocuments,
  downloadSigned,
  downloadAllSigned,
  saveDocument,
} from "slices/Documents";
import { showForm } from "slices/Modals";
import { clearDocStore } from "init-app/database";
import { askConfirmation } from "slices/ConfirmDialog";

const mapStateToProps = (state) => {
  return {
    documents: state.documents.documents,
    destinationUrl: state.main.signingData.destination_url,
    binding: state.main.signingData.binding,
    relayState: state.main.signingData.relay_state,
    signRequest: state.main.signingData.sign_request,
    size: state.main.size,
    multisign_buttons: state.main.multisign_buttons,
    pending: state.main.pending_multisign,
    owned: state.main.owned_multisign,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handlePreview: function (name) {
      return () => {
        dispatch(showPreview(name));
      };
    },
    handleRemove: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
      };
    },
    handleRetry: function (doc, props) {
      return async () => {
        await dispatch(prepareDocument({ doc: doc, intl: props.intl }));
        dispatch(setState({ name: doc.name, state: "loading" }));
        await dispatch(saveDocument({ docName: doc.name }));
      };
    },
    handleDocSelection: function (name) {
      return async (e) => {
        dispatch(toggleDocSelection({ name: name, select: e.target.checked }));
        await dispatch(saveDocument({ docName: name }));
      };
    },
    handleSubmitToSign: async function () {
      await dispatch(startSigning({ intl: this.props.intl }));
    },
    handleDownloadAll: async function () {
      await dispatch(downloadAllSigned({ intl: this.props.intl }));
    },
    handleDlSigned: function (name) {
      return async () => {
        await dispatch(downloadSigned(name));
      };
    },
    openInviteForm: function (doc) {
      return () => {
        dispatch(showForm(doc.id));
      };
    },
    clearDb: function () {
      clearDocStore(dispatch, props.intl);
      dispatch(removeAllDocuments());
    },
    showConfirm: function (confirmId) {
      return () => {
        dispatch(askConfirmation(confirmId));
      };
    },
    handleForcedPreview: function (name) {
      return () => {
        dispatch(showForcedPreview(name));
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(hideForcedPreview(name));
      };
    },
    handleConfirmForcedPreview: function (name) {
      return async () => {
        dispatch(confirmForcedPreview(name));
        await dispatch(saveDocument({ docName: name }));
        dispatch(hideForcedPreview(name));
      };
    },
    handleUnConfirmForcedPreview: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
        dispatch(hideForcedPreview(name));
      };
    },
    handleClosePreview: function (name) {
      return () => {
        dispatch(hidePreview(name));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
