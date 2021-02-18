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

import InviteForm from "components/InviteForm";

import { closeInviteForm, updateInvitees, sendInvites } from "slices/Invite";

const mapStateToProps = (state) => {
  return {
    show: state.invites.showForm,
    invitees: state.invites.invitees,
    documentId: state.invites.documentId,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleClose: function () {
      dispatch(closeInviteForm());
    },
    handleChange: function (invitees) {
      dispatch(updateInvitees(invitees));
    },
    handleSubmit: function (e) {
      e.preventDefault();
      dispatch(sendInvites());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);


