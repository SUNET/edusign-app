/**
 * @module containers/Invited
 * @desc In this module we connect the Invited component with the Redux store.
 *
 */
import { connect } from "react-redux";

import Invited from "components/Invited";
import {
  getPartiallySignedDoc,
  hideInvitedPreview,
  setInvitedSigning,
} from "slices/Main";

const mapStateToProps = (state) => {
  return {
    invited: state.main.pending_multisign,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    startMultiSigning: (docRef) => {
      return () => {
        dispatch(setInvitedSigning(docRef));
        window.document.location.href = "/sign/invitation/" + docRef;
      };
    },
    showPreview: (docKey) => {
      return () => {
        dispatch(getPartiallySignedDoc({key: docKey, stateKey: 'pending_multisign', intl: props.intl}));
      };
    },
    handleClosePreview: function (docKey) {
      return () => {
        dispatch(hideInvitedPreview(docKey));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Invited);
