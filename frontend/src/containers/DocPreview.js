import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DocPreview from "components/DocPreview";
import {
  hidePreview,
} from "slices/Documents";

const mapStateToProps = (state, props) => {
  return {
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleClose: function (index) {
      return (e) => {
        dispatch(hidePreview(index));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocPreview);
