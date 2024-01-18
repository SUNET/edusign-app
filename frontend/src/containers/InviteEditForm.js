/**
 * @module containers/InviteEditForm
 * @desc In this module we connect the InviteEditForm component with the Redux store.
 *
 * In mapStateToProps we take a few keys from the central store
 * and assign them to the props of the component.
 *
 * in mapDispatchToProps we compose the event handlers making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import InviteEditForm from "components/InviteEditForm";

import { editInvites } from "slices/Invitations";
import { hideEditInvitationForm } from "slices/Modals";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { unsetActiveId } from "slices/Overlay";

const mapStateToProps = (state, props) => {
  let show = false;
  if (
    state.modals.show_form &&
    state.modals.form_id === props.docKey + "-edit-invitations"
  ) {
    show = true;
  }
  let ordered;
  if (state.inviteform.ordered === null) {
    ordered = state.main.ui_defaults.ordered_invitations;
  } else {
    ordered = state.inviteform.ordered;
  }
  const doc = state.main.owned_multisign.filter(
    (d) => d.key === props.docKey
  )[0];
  return {
    size: state.main.size,
    show: show,
    doc: doc,
    mail: state.main.signer_attributes.mail,
    mail_aliases: state.main.signer_attributes.mail_aliases,
    max_signatures: state.main.max_signatures,
    ui_defaults: state.main.ui_defaults,
    ordered: ordered,
  };
};

const _close = (dispatch) => {
  dispatch(unsetSpinning());
  dispatch(enablePolling());
  dispatch(hideEditInvitationForm());
  dispatch(unsetActiveId());
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values) {
      await dispatch(editInvites({ values: values, intl: this.props.intl }));
      _close(dispatch);
    },
    handleClose: function () {
      _close(dispatch);
    },
    handleCloseResetting: function (resetForm) {
      return () => {
        _close(dispatch);
        resetForm();
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteEditForm);
