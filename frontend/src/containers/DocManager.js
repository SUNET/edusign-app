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
  showPreview,
  hidePreview,
  removeDocument,
  startSigning,
  setSigned,
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
    handleSign: function (index) {
      // this code is just a placeholder until we are actually signing documents.
      return (e) => {
        dispatch(startSigning(index));
        setTimeout(() => {
          dispatch(setSigned(index));
        }, 1000);
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
