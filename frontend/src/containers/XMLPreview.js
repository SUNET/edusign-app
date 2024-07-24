/**
 * @module containers/DocPreview
 * @desc In this module we connect the DocPreview component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to close the modal, making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import XMLPreview from "components/XMLPreview";

const mapStateToProps = (state) => {
  return {
    width: state.main.width,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(XMLPreview);
