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
    handleDragOver: function (e) {
      alert(e);
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
        dispatch(addDocument(file));
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);
        reader.onload = () => {
          const updatedFile = {
            ...file,
            blob: reader.result,
          };
          dispatch(updateDocument(updatedFile));
          dispatch(setWaiting());
        };
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
