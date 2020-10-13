import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DnDArea from "components/DnDArea";
import { addDocuments, addDocument } from "slices/Documents";

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
      fileObjs.forEach(fileObj => {
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);
        reader.onload = () => {
          const file = {
            name: fileObj.name,
            size: fileObj.size,
            type: fileObj.type,
            blob: reader.result,
          };
          console.log(file);
          dispatch(addDocument(file));
        };
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DnDArea);
