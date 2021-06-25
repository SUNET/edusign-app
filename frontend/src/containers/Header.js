/**
 * @module containers/Header
 * @desc In this module we connect the Header component with the Redux store,
 *
 * In mapStateToProps we take some keys from the central store
 * and add them to the props of the component.
 *
 * in mapDispatchToProps we compose the handler to clear the IndexedDB store
 * of any documents it may hold.
 */
import { connect } from "react-redux";

import Header from "components/Header";
import { clearDocStore } from "init-app/database";
import { removeAllDocuments } from "slices/Documents";
import { askConfirmation } from "slices/ConfirmDialog";

const mapStateToProps = (state) => {
  if (state.main.signer_attributes === undefined) {
    return {
      loading: true,
      size: state.main.size,
    };
  }
  return {
    loading: false,
    signer_attributes: state.main.signer_attributes,
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    clearDb: function () {
      clearDocStore(dispatch, props.intl);
      dispatch(removeAllDocuments());
    },
    showConfirm: function (confirmId) {
      return () => {
        dispatch(askConfirmation(confirmId));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
