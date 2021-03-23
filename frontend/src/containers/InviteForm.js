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

import { sendInvites } from "slices/Documents";

const mapStateToProps = (state) => {
  return {
    size: state.main.size,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    handleSubmit: function (values) {
      console.log("Sending invites", values);
      dispatch(sendInvites(values));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);
