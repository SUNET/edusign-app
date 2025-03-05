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
  createTemplate,
  showTemplatePreview,
  hideTemplatePreview,
} from "slices/Templates";
import { downloadPersonalDraft, } from "slices/Main";
import { showForm } from "slices/Modals";
import { clearDocStore } from "init-app/database";
import { askConfirmation } from "slices/ConfirmDialog";
import { disablePolling, enablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";
import { setActiveId, unsetActiveId } from "slices/Overlay";
import { isNotInviting } from "slices/InviteForm";
import { showPDFForm } from "slices/PDFForms";

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
    inviting: state.inviteform.inviting,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handlePreview: function (key) {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(showPreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleTemplatePreview: function (key) {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(showTemplatePreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleDlPersonalDraft: function (args) {
      return async () => {
        await dispatch(downloadPersonalDraft(args));
        dispatch(unsetSpinning());
      };
    },
    handleCreateTemplate: function (key, props) {
      return async () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        await dispatch(createTemplate({ documentKey: key, intl: props.intl }));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleRemove: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
      };
    },
    handleRemoveDocument: function (doc, props) {
      return async () => {
        dispatch(disablePolling());
        await dispatch(removeDocument({ docName: doc.name }));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
      };
    },
    handleSignedRemove: function (name) {
      return async () => {
        await dispatch(removeDocument({ docName: name }));
      };
    },
    handleTemplateRemove: function (docid, props) {
      return async () => {
        await dispatch(removeTemplate({ docid: docid, intl: props.intl }));
      };
    },
    handleRetry: function (doc, props) {
      return async () => {
        dispatch(setState({ name: doc.name, state: "loading" }));
        await dispatch(prepareDocument({ doc: doc, intl: props.intl }));
        await dispatch(saveDocument({ docKey: doc.key }));
        dispatch(unsetSpinning());
      };
    },
    handleDocSelection: function (name, key) {
      return async (e) => {
        dispatch(toggleDocSelection({ name: name, select: e.target.checked }));
        await dispatch(saveDocument({ docKey: key }));
      };
    },
    handleSubmitToSign: async function () {
      await dispatch(startSigning({ intl: this.props.intl }));
    },
    handleDownloadAll: async function () {
      await dispatch(downloadAllSigned({ intl: this.props.intl }));
    },
    handleDlSigned: function (args) {
      return async () => {
        await dispatch(downloadSigned(args.docName));
        dispatch(unsetSpinning());
      };
    },
    openInviteForm: function (doc) {
      return () => {
        dispatch(isNotInviting());
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
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
        dispatch(setActiveId("dummy-help-id"));
        dispatch(askConfirmation(confirmId));
      };
    },
    handleForcedPreview: function (key) {
      return () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        dispatch(showForcedPreview(key));
        dispatch(unsetSpinning());
      };
    },
    handleCloseForcedPreview: function (name) {
      return () => {
        dispatch(hideForcedPreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleConfirmForcedPreview: function (name, key) {
      return async () => {
        dispatch(confirmForcedPreview(key));
        await dispatch(saveDocument({ docKey: key }));
        dispatch(hideForcedPreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleUnConfirmForcedPreview: function (args) {
      return async () => {
        await dispatch(removeDocument({ docName: args.doc.name }));
        dispatch(hideForcedPreview(args.doc.name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleClosePreview: function (name) {
      return () => {
        dispatch(hidePreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleCloseTemplatePreview: function (name) {
      return () => {
        dispatch(hideTemplatePreview(name));
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
      };
    },
    handleFillForm: function (doc) {
      return () => {
        dispatch(disablePolling());
        dispatch(setActiveId("dummy-help-id"));
        dispatch(showPDFForm(doc));
        dispatch(unsetSpinning());
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
