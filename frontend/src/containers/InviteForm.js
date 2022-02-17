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
import { unsetSpinning } from "slices/Button";
import { toggleLoa } from "slices/InviteForm";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.modals.show_form && state.modals.form_id === props.docId) {
    show = true;
  }
  return {
    size: state.main.size,
    show: show,
    mail: state.main.signer_attributes.mail,
    loas: state.main.available_loas,
    show_loa: state.inviteform.show_loa_selection,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values) {
      await dispatch(sendInvites({ values: values, intl: this.props.intl }));
      dispatch(unsetSpinning());
      dispatch(hideForm());
    },
    handleClose: function () {
      dispatch(unsetSpinning());
      dispatch(hideForm());
    },
    handleToggleLoa: function () {
      dispatch(toggleLoa());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);
