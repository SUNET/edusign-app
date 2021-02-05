/**
 * @module containers/Main
 * @desc In this module we connect the Main component with the Redux store.
 * basically to get the window size from the central store.
 *
 */
import { connect } from "react-redux";

import Main from "components/Main";

const mapStateToProps = (state) => {
  return {
    size: state.main.size,
  };
};

export default connect(mapStateToProps)(Main);
