/**
 * @module containers/DocManager
 * @desc In this module we connect the DocManager component with the Redux store.
 *
 * In mapStateToProps we take the state.documents.documents key from the central store
 * and assign it to the documents prop of the component.
 *
 * in mapDispatchToProps we compose the event handlers making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import DocManager from "components/DocManager";
import {
  prepareDocument,
  showPreview,
  hidePreview,
  toggleDocSelection,
  startSigningDocuments,
  removeDocument,
} from "slices/Documents";

const mapStateToProps = (state, props) => {
  return {
    documents: state.documents.documents,
    destinationUrl: state.main.signingData.destinationUrl,
    binding: state.main.signingData.binding,
    relayState: state.main.signingData.relayState,
    signRequest: state.main.signingData.signRequest,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handlePreview: function (name) {
      return (e) => {
        dispatch(showPreview(name));
      };
    },
    handleRemove: function (name) {
      return (e) => {
        dispatch(removeDocument(name));
      };
    },
    handleRetry: function (name) {
      return (e) => {
        dispatch(prepareDocument(name));
      };
    },
    handleDocSelection: function (name) {
      return (e) => {
          dispatch(toggleDocSelection({name: name, select: e.target.checked}));
      };
    },
    handleSubmitToSign: function (e) {
      dispatch(startSigningDocuments());
    },
    handleDlSigned: function (name) {
      // this code is just a placeholder until we are actually signing documents.
      return (e) => {
        alert("TODO");
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
