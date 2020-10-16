import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

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
    handleClose: function (index) {
      return (e) => {
        dispatch(hidePreview(index));
      };
    },
    handleRemove: function (index) {
      return (e) => {
        dispatch(removeDocument(index));
      };
    },
    handleSign: function (index) {
      return (e) => {
        dispatch(startSigning(index));
        setTimeout(() => {
          dispatch(setSigned(index));
        }, 1000);
      };
    },
    handleDlSigned: function (index) {
      return (e) => {
        alert("TODO");
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocManager);
