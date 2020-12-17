/**
 * @module containers/Header
 * @desc In this module we connect the Header component with the Redux store,
 * basically to obtain the given name and surname.
 */
import { connect } from "react-redux";

import Header from "components/Header";
import { clearDocStore } from "init-app/database";
import { removeAllDocuments } from "slices/Documents";

const mapStateToProps = (state, props) => {
  if (state.main.config === undefined) {
    return {
      loading: true,
    };
  }
  return {
    loading: false,
    givenName: state.main.config.given_name,
    surname: state.main.config.surname,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    clearDb: function (e) {
      clearDocStore(dispatch);
      dispatch(removeAllDocuments());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
