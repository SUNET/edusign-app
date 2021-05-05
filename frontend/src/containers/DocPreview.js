/**
 * @module containers/DocPreview
 * @desc In this module we connect the DocPreview component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to close the modal, making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import DocPreview from "components/DocPreview";
import { hidePreview } from "slices/Documents";

const mapStateToProps = (state) => {
  return {
    size: state.main.size,
    width: state.main.width,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleClose: function (name) {
      return () => {
        dispatch(hidePreview(name));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DocPreview);
