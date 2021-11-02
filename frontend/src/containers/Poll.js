/**
 * @module containers/Poll
 * @desc In this module we connect the Poll component with the Redux store.
 */
import { connect } from "react-redux";

import Poll from "components/Poll";
import { poll, setPolling, setTimerId } from "slices/Poll";

const mapStateToProps = (state) => {
  return {
    poll: state.poll.poll,
    disabled: state.poll.disablePoll,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    pollInvitations: () => {
      dispatch(poll());
    },
    stopPolling: () => {
      dispatch(setPolling(false));
    },
    setTimerId: (timerId) => {
      dispatch(setTimerId(timerId));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Poll);
