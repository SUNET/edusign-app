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
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DnDArea from "components/DnDArea";
import { addDocument, updateDocument } from "slices/Documents";
import { setWaiting, setReceiving } from "slices/DnDArea";

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
        reader.readAsDataURL(fileObj);
        reader.onload = () => {
          const updatedFile = {
            ...file,
            blob: reader.result,
          };
          // once the document has been loaded and parsed,
          // update it in the central store as "loaded".
          dispatch(updateDocument(updatedFile));
          dispatch(setWaiting());
        };
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
