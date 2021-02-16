/**
 * @module containers/InvitesForm
 * @desc In this module we connect the InvitesForm component with the Redux store.
 *
 * In mapStateToProps we take a few keys from the central store
 * and assign them to the props of the component.
 *
 * in mapDispatchToProps we compose the event handlers making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import InvitesForm from "components/InvitesForm";
import {
  stopInviting
} from "slices/Invites";
import {
  sendMultiSignRequest
} from "slices/Documents";

const mapStateToProps = (state) => {
  return {
    docId: state.invites.documentId,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleSendInvites: function (docId, invites) {
      dispatch(sendMultiSignRequest({
        docId,
        invites
      }));
    },
    handleCloseForm: function () {
      dispatch(stopInviting());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InvitesForm);

