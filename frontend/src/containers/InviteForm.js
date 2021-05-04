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
import { hideForm } from "slices/Modals";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.modals.show_form && state.modals.form_id === props.docId) {
    show = true;
  }
  return {
    size: state.main.size,
    show: show,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: function (values) {
      dispatch(sendInvites(values));
    },
    handleClose: function () {
      dispatch(hideForm());
    }
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);
