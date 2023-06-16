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

const mapStateToProps = (state) => {
  if (state.main.signer_attributes === undefined) {
    return {
      loading: true,
      size: state.main.size,
      company_link: '',
      edusign_logo: '',
      company_logo: '',
      edusign_logo_small: '',
      company_logo_small: '',
    };
  }
  if (state.main.lookandfeel === undefined) {
    return {
      loading: false,
      signer_attributes: state.main.signer_attributes,
      size: state.main.size,
      company_link: '',
      edusign_logo: '',
      company_logo: '',
      edusign_logo_small: '',
      company_logo_small: '',
    };
  } else {
    return {
      loading: false,
      signer_attributes: state.main.signer_attributes,
      size: state.main.size,
      company_link: state.main.lookandfeel.company_link,
      edusign_logo: state.main.lookandfeel.edusign_logo,
      company_logo: state.main.lookandfeel.company_logo,
      edusign_logo_small: state.main.lookandfeel.edusign_logo_small,
      company_logo_small: state.main.lookandfeel.company_logo_small,
    };
  }
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleLogout: function () {
      document.location = "logout";
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
