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

import DnDArea from "components/DnDArea";
import { createDocument } from "slices/Documents";
import { setWaiting, setLoading, setReceiving } from "slices/DnDArea";
import { addNotification } from "slices/Notifications";

const mapStateToProps = (state) => {
  return {
    status: state.dnd.state,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleDragEnter: function () {
      dispatch(setReceiving());
    },
      handleDragLeave: function () {
        dispatch(setWaiting());
    },
    handleFileDrop: function (fileObjs) {
      console.log("Starting to handle dropping of files", fileObjs);
      dispatch(setLoading());
      const maxIndex = fileObjs.length - 1;
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
        reader.onerror = (e) => {
          console.log("Error reading Document", e);
          const errorMsg = this.props.intl.formatMessage(
            {
              defaultMessage: "Error loading {name}",
              id: "containers.DnDArea.loading-error",
            },
            { name: fileObj.name }
          );
          dispatch(addNotification({ level: "danger", message: errorMsg }));
          file.state = "failed-loading";
          file.message = "XXX Document could not be loaded";
          dispatch(createDocument(file));
          dispatch(setWaiting());
        };
        reader.readAsDataURL(fileObj);
        console.log("Finished handling dropping of files");
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
