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
  downloadSigned,
} from "slices/Documents";
import { showForm } from "slices/Modals";

const mapStateToProps = (state) => {
  return {
    documents: state.documents.documents,
    destinationUrl: state.main.signingData.destination_url,
    binding: state.main.signingData.binding,
    relayState: state.main.signingData.relay_state,
    signRequest: state.main.signingData.sign_request,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch) => {
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
    handleRetry: function (doc) {
      return () => {
        dispatch(prepareDocument(doc));
        dispatch(setState({ name: doc.name, state: "loading" }));
      };
    },
    handleDocSelection: function (name) {
      return (e) => {
        dispatch(toggleDocSelection({ name: name, select: e.target.checked }));
      };
    },
    handleSubmitToSign: function () {
      dispatch(startSigningDocuments());
    },
    handleDlSigned: function (name) {
      return () => {
        dispatch(downloadSigned(name));
      };
    },
    openInviteForm: function (doc) {
      return () => {
        dispatch(showForm(doc.id));
      }
    }
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
