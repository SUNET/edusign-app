/**
 * @module containers/ConfirmDialog
 * @desc In this module we connect the ConfirmDialog component with the Redux store.
 * basically to work out whether to show it or not.
 *
 */
import { connect } from "react-redux";

import ConfirmDialog from "components/ConfirmDialog";
import { closeConfirmation } from "slices/ConfirmDialog";

const mapStateToProps = (state, props) => {
  return {
    show: Boolean(state.confirm[props.confirmId]),
    dummy: state.confirm.dummy,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    closeConfirm: function () {
      console.log("AAAAAAAAAAAAAAAAAAAAAA", props.confirmId, props);
      dispatch(closeConfirmation(props.confirmId));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmDialog);
