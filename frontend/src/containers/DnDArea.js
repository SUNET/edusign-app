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
import {
  createDocument,
} from "slices/Documents";
import { setWaiting, setLoading, setReceiving } from "slices/DnDArea";
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
      dispatch(setLoading());
      const maxIndex = fileObjs.length - 1
      fileObjs.forEach((fileObj, index) => {
        const file = {
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type,
          blob: null,
        };
        const reader = new FileReader();
        reader.onload = () => {
          const updatedFile = {
            ...file,
            blob: reader.result,
          };
          console.log("loaded file", updatedFile);
          dispatch(createDocument(updatedFile));
          if (index === maxIndex) {
            dispatch(setWaiting());
          }
        };
        reader.onerror = () => {
          const errorMsg = this.props.intl.formatMessage(
            {
              defaultMessage: "Error loading {name}",
              id: "containers.DnDArea.loading-error",
            },
            { name: fileObj.name }
          );
          dispatch(addNotification({ level: "danger", message: errorMsg }));
          file.state = "failed-loading";
          dispatch(createDocument(file));
          dispatch(setWaiting());
        };
        reader.readAsDataURL(fileObj);
      });
    },
    handleRejected: function (rejecteds, e) {
      rejecteds.forEach((rejected) => {
        const errorMsg = this.props.intl.formatMessage(
          {
            id: "containers.DnDArea.rejected-doc",
            defaultMessage: "Not a PDF: {name} (type {type})",
          },
          { name: rejected.file.name, type: rejected.file.type }
        );
        dispatch(addNotification({ level: "danger", message: errorMsg }));
        dispatch(updateDocumentFail({ name: rejected.file.name }));
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
