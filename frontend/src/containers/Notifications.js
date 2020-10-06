import { connect } from "react-redux";
import Notifications from "components/Notifications";
import { rmNotification } from "slices/Notifications";


const mapStateToProps = (state, props) => {
  return {
    notification: state.notifications.notification,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleRMNotification() {
      dispatch(rmNotification());
    },
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Notifications);
