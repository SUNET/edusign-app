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
import {
  removeTemplate,
  showTemplatePreview,
  hideTemplatePreview,
} from "slices/Templates";
import { showForm } from "slices/Modals";
import { clearDocStore } from "init-app/database";
import { askConfirmation } from "slices/ConfirmDialog";
import { disablePolling, enablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {
    documents: state.documents.documents,
    templates: state.template.documents,
    destinationUrl: state.main.signingData.destination_url,
    binding: state.main.signingData.binding,
    relayState: state.main.signingData.relay_state,
    signRequest: state.main.signingData.sign_request,
    size: state.main.size,
    multisign_buttons: state.main.multisign_buttons,
    pending: state.main.pending_multisign,
    owned: state.main.owned_multisign,
    unauthn: state.main.unauthn,
    invitedUnauthn: state.main.pending_multisign.length > 0,
    name: state.main.signer_attributes.name,
    mail: state.main.signer_attributes.mail,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handlePreview: function (key) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(showPreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleTemplatePreview: function (key) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(showTemplatePreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleRemove: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
      };
    },
    handleSignedRemove: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
      };
    },
    handleTemplateRemove: function (docid) {
      return async () => {
        await dispatch(removeTemplate({ docid: docid }));
      };
    },
    handleRetry: function (doc, props) {
      return async () => {
        dispatch(setState({ name: doc.name, state: "loading" }));
        await dispatch(prepareDocument({ doc: doc, intl: props.intl }));
        await dispatch(saveDocument(doc.name));
        dispatch(unsetSpinning());
      };
    },
    handleDocSelection: function (name) {
      return async (e) => {
        dispatch(toggleDocSelection({ name: name, select: e.target.checked }));
        await dispatch(saveDocument(name));
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
        dispatch(unsetSpinning());
      };
    },
    openInviteForm: function (doc) {
      return () => {
        dispatch(disablePolling());
        dispatch(showForm(doc.id));
        dispatch(unsetSpinning());
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
    handleForcedPreview: function (key) {
      return () => {
        dispatch(disablePolling());
        dispatch(showForcedPreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(hideForcedPreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleConfirmForcedPreview: function (name) {
      return async () => {
        dispatch(confirmForcedPreview(name));
        await dispatch(saveDocument(name));
        dispatch(hideForcedPreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleUnConfirmForcedPreview: function (args) {
      return async () => {
        await dispatch(removeDocument({ docName: args.doc.name }));
        dispatch(hideForcedPreview(args.doc.name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleClosePreview: function (name) {
      return () => {
        dispatch(hidePreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleCloseTemplatePreview: function (name) {
      return () => {
        dispatch(hideTemplatePreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
