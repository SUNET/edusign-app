/**
 * @module containers/Owned
 * @desc In this module we connect the Owned component with the Redux store.
 *
 */
import { connect } from "react-redux";

import Owned from "components/Owned";

const mapStateToProps = (state) => {
  return {
    owned: state.main.owned_multisign,
  };
};

export default connect(mapStateToProps)(Owned);
