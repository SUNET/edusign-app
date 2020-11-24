/**
 * @module containers/Header
 * @desc In this module we connect the Header component with the Redux store,
 * basically to obtain the given name and surname.
 */
import { connect } from "react-redux";

import Header from "components/Header";

const mapStateToProps = (state, props) => {
  if (state.main.config === undefined) {
    return {
      loading: true,
    };
  }
  return {
    loading: false,
    givenName: state.main.config.payload.given_name,
    surname: state.main.config.payload.surname,
  };
};

export default connect(mapStateToProps)(Header);
