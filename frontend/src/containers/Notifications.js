/**
 * @module containers/Notifications
 * @desc In this module we connect the Notifications component with the Redux store.
 *
 * In mapStateToProps we take the state.notifications.notification key from the central store
 * and assign it to the notification prop of the component.
 *
 * in mapDispatchToProps we compose the event handler to remove the notification making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";
import Notifications from "components/Notifications";
import { rmNotification } from "slices/Notifications";

const mapStateToProps = (state, props) => {
  return {
    messages: state.notifications.messages,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleRMNotification(index) {
      return () => {
        dispatch(rmNotification(index));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);
