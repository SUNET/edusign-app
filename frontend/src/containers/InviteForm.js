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

import { sendInvites } from "slices/Invitations";
import { hideForm } from "slices/Modals";
import { unsetSpinning } from "slices/Button";
import { disablePolling, enablePolling } from "slices/Poll";
import { toggleLoa, toggleMakeCopy, dontMakeCopy, isNotInviting, isInviting } from "slices/InviteForm";
import { unsetActiveId } from "slices/Overlay";

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
    make_copy: state.inviteform.make_copy,
    inviting: state.inviteform.inviting,
    templates: state.template.documents,
    documents: state.documents.documents,
    owned: state.main.owned_multisign,
  };
};

const _close = (dispatch) => {
  dispatch(unsetSpinning());
  dispatch(enablePolling());
  dispatch(hideForm());
  dispatch(unsetActiveId());
  dispatch(dontMakeCopy());
  dispatch(isNotInviting());
}

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values, actions) {
      await dispatch(sendInvites({ values: values, intl: this.props.intl }));
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(hideForm());
      dispatch(unsetActiveId());
      dispatch(dontMakeCopy());
      dispatch(isNotInviting());
    },
    handleClose: function () {
      _close(dispatch);
    },
    handleCloseResetting: function (resetForm) {
      return () => {
        _close(dispatch);
        resetForm();
      }
    },
    handleToggleLoa: function () {
      dispatch(toggleLoa());
      dispatch(isNotInviting());
    },
    handleMakeCopyToggle: function () {
      dispatch(toggleMakeCopy());
      dispatch(isNotInviting());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);
