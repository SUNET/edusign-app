/**
 * @module containers/Main
 * @desc In this module we connect the Main component with the Redux store.
 */
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import Main from "components/Main";

const mapStateToProps = (state, props) => {
  return {
    size: state.main.size,
  };
};

export default connect(mapStateToProps)(Main);
