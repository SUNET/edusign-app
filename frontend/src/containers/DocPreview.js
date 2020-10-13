import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DocPreview from "components/DocPreview";
import { showPreview, hidePreview } from "slices/Documents";

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
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocPreview);
