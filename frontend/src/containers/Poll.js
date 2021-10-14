/**
 * @module containers/Poll
 * @desc In this module we connect the Poll component with the Redux store.
 */
import { connect } from "react-redux";

import Poll from "components/Poll";
import { poll, setPolling } from "slices/Main";

const mapStateToProps = (state) => {
  return {
    poll: state.main.poll,
    disabled: state.main.disablePoll,
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
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Poll);
