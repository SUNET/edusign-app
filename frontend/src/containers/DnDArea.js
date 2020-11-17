/**
 * @module containers/DnDArea
 * @desc In this module we connect the DnDArea component with the Redux store.
 *
 * In mapStateToProps we take the state.dnd.state key from the central store
 * and assign it to the status prop of the component.
 *
 * in mapDispatchToProps we compose the drag event handlers making use
 * of the Redux dispatch function.
 */
import React from "react";
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DnDArea from "components/DnDArea";
import { addDocument, updateDocument, prepareDocument } from "slices/Documents";
import { setWaiting, setReceiving } from "slices/DnDArea";
import { addNotification } from "slices/Notifications";

const mapStateToProps = (state, props) => {
  return {
    status: state.dnd.state,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDragEnter: function (e) {
      dispatch(setReceiving());
    },
    handleDragLeave: function (e) {
      dispatch(setWaiting());
    },
    handleFileDrop: function (fileObjs) {
      fileObjs.forEach((fileObj) => {
        const file = {
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type,
          blob: null,
        };
        // dispatch a "loading" document to the central store
        dispatch(addDocument(file));
        const reader = new FileReader();
        reader.onload = () => {
          const updatedFile = {
            ...file,
            blob: reader.result,
          };
          // once the document has been loaded and parsed,
          // update it in the central store as "loaded".
          dispatch(updateDocument(updatedFile));
          dispatch(prepareDocument(updatedFile));
          dispatch(setWaiting());
        };
        reader.onerror = () => {
          const errorMsg = this.props.intl.formatMessage({defaultMessage: "Error loading {name}", id: "containers.DnDArea.loading-error"}, {name: fileObj.name});
          dispatch(addNotification({level: "danger", message: errorMsg}));
        };
        reader.readAsDataURL(fileObj);
      });
    },
    handleRejected: function (rejecteds, e) {
      rejecteds.forEach(rejected => {
        const errorMsg = this.props.intl.formatMessage({id: "containers.DnDArea.rejected-doc", defaultMessage: "Not a PDF: {name} (type {type})"}, {name: rejected.file.name, type: rejected.file.type});
        dispatch(addNotification({level: "danger", message: errorMsg}));
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
