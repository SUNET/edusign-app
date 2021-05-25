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

import ReInviteForm from "components/ReInviteForm";

import { resendInvitations } from "slices/Documents";
import { hideResend } from "slices/Modals";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.modals.show_resend && state.modals.resend_id === props.doc.key) {
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
      dispatch(resendInvitations({ values: values, intl: this.props.intl }));
    },
    handleClose: function () {
      dispatch(hideResend());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ReInviteForm);
