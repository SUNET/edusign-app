/**
 * @module containers/ForcedXMLPreview
 * @desc In this module we connect the ForcedXMLPreview component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to close the modal, making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import ForcedXMLPreview from "components/ForcedXMLPreview";

const mapStateToProps = (state) => {
  return {
    size: state.main.size,
    width: state.main.width,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(ForcedXMLPreview);
