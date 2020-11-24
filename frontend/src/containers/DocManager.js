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
  removeDocument,
} from "slices/Documents";

const mapStateToProps = (state, props) => {
  return {
    documents: state.documents.documents,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handlePreview: function (index) {
      return (e) => {
        dispatch(showPreview(index));
      };
    },
    handleRemove: function (index) {
      return (e) => {
        dispatch(removeDocument(index));
      };
    },
    handleRetry: function (index) {
      return (e) => {
        dispatch(prepareDocument(index));
      };
    },
    handleDlSigned: function (index) {
      // this code is just a placeholder until we are actually signing documents.
      return (e) => {
        alert("TODO");
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
