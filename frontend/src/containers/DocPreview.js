/**
 * @module containers/DocPreview
 * @desc In this module we connect the DocPreview component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to close the modal making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DocPreview from "components/DocPreview";
import { hidePreview } from "slices/Documents";

const mapStateToProps = (state, props) => {
  return {};
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleClose: function (name) {
      return (e) => {
        dispatch(hidePreview(name));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocPreview);
