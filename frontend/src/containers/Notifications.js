/**
 * @module containers/Notifications
 * @desc In this module we connect the Notifications component with the Redux store.
 *
 * In mapStateToProps we take the state.notifications.message key from the central store
 * and assign it to the message prop of the component.
 *
 * in mapDispatchToProps we compose the event handler to remove notification making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";
import Notifications from "components/Notifications";
import { rmNotification } from "slices/Notifications";

const mapStateToProps = (state) => {
  return {
    message: state.notifications.message,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleRMNotification() {
      dispatch(rmNotification());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);
