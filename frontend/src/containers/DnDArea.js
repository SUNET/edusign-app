import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DnDArea from "components/DnDArea";
import { addDocument, updateDocument } from "slices/Documents";

const mapStateToProps = (state, props) => {
  return {};
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleDragEnter: function (e) {
      alert(e);
    },
    handleDragOver: function (e) {
      alert(e);
    },
    handleDragLeave: function (e) {
      alert(e);
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
        };
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
