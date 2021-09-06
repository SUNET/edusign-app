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
  prepareDocument,
  showPreview,
  setState,
  toggleDocSelection,
  startSigningDocuments,
  removeDocument,
  removeAllDocuments,
  downloadSigned,
  downloadAllSigned,
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
      return () => {
        dispatch(removeDocument(name));
      };
    },
    handleRetry: function (doc, props) {
      return () => {
        dispatch(prepareDocument({ doc: doc, intl: props.intl }));
        dispatch(setState({ name: doc.name, state: "loading" }));
      };
    },
    handleDocSelection: function (name) {
      return (e) => {
        dispatch(toggleDocSelection({ name: name, select: e.target.checked }));
      };
    },
    handleSubmitToSign: function () {
      dispatch(startSigningDocuments({ intl: this.props.intl }));
    },
    handleDownloadAll: function () {
      dispatch(downloadAllSigned({ intl: this.props.intl }));
    },
    handleDlSigned: function (name) {
      return () => {
        dispatch(downloadSigned(name));
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
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
