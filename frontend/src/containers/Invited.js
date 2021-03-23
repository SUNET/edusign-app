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

const mapDispatchToProps = (dispatch) => {
  return {
    startMultiSigning: (docRef) => {
      return () => {
        window.document.location.href = "/sign/invitation/" + docRef;
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Invited);
