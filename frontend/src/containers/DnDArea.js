/**
 * @module containers/DnDArea
 * @desc In this module we connect the DnDArea component with the Redux store.
 *
 * In mapStateToProps we take the state.dnd.state and state.main.size keys from the central store
 * and assign it to the status prop of the component.
 *
 * in mapDispatchToProps we compose the drag event handlers making use
 * of the Redux dispatch function.
 */
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
    handleFileDrop: function (intl) {
      return (fileObjs) => {
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
            dispatch(createDocument({ doc: updatedFile, intl: intl }));
            if (index === maxIndex) {
              dispatch(setWaiting());
            }
          };
          reader.onerror = (e) => {
            const errorMsg = intl.formatMessage(
              {
                defaultMessage: "Error loading {name}",
                id: "containers.DnDArea.loading-error",
              },
              { name: fileObj.name }
            );
            dispatch(addNotification({ level: "danger", message: errorMsg }));
            file.state = "failed-loading";
            file.message = intl.formatMessage({
              defaultMessage: "Document could not be loaded",
              id: "dnd-doc-not-loaded",
            });
            dispatch(createDocument({ doc: file, intl: intl }));
            dispatch(setWaiting());
          };
          reader.readAsDataURL(fileObj);
          dispatch(setWaiting());
        });
      };
    },
    handleRejected: function (intl) {
      dispatch(setWaiting());
      return (rejecteds, e) => {
        rejecteds.forEach((rejected) => {
          const errorMsg = intl.formatMessage(
            {
              id: "containers.DnDArea.rejected-doc",
              defaultMessage: "Not a PDF: {name} (type {type})",
            },
            { name: rejected.file.name, type: rejected.file.type }
          );
          dispatch(addNotification({ level: "danger", message: errorMsg }));
          dispatch(updateDocumentFail({ name: rejected.file.name }));
        });
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
