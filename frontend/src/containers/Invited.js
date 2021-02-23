/**
 * @module containers/Invited
 * @desc In this module we connect the Invited component with the Redux store.
 *
 */
import { connect } from "react-redux";

import Invited from "components/Invited";

const mapStateToProps = (state) => {
  return {
    invited: state.main.pending_multisign,
  };
};

export default connect(mapStateToProps)(Invited);

