/**
 * @module containers/DocPreview
 * @desc In this module we connect the ForcedPreview component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to close the modal, making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import ForcedPreview from "components/ForcedPreview";

const mapStateToProps = (state) => {
  return {
    size: state.main.size,
    width: state.main.width,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(ForcedPreview);
