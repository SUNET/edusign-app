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
import { enablePolling } from "slices/Poll";
import { toggleLoa, isNotInviting, setOrdered } from "slices/InviteForm";
import { unsetActiveId } from "slices/Overlay";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.modals.show_form && state.modals.form_id === props.docId) {
    show = true;
  }
  let ordered;
  if (state.inviteform.ordered === null) {
    ordered = state.main.ui_defaults.ordered_invitations;
  } else {
    ordered = state.inviteform.ordered;
  }
  return {
    size: state.main.size,
    show: show,
    mail: state.main.signer_attributes.mail,
    mail_aliases: state.main.signer_attributes.mail_aliases,
    loas: state.main.available_loas,
    show_loa: state.inviteform.show_loa_selection,
    inviting: state.inviteform.inviting,
    templates: state.template.documents,
    documents: state.documents.documents,
    owned: state.main.owned_multisign,
    max_signatures: state.main.max_signatures,
    ui_defaults: state.main.ui_defaults,
    ordered: ordered,
  };
};

const _close = (dispatch) => {
  dispatch(unsetSpinning());
  dispatch(enablePolling());
  dispatch(hideForm());
  dispatch(unsetActiveId());
  dispatch(isNotInviting());
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values, actions) {
      dispatch(setValues(values));
      await dispatch(sendInvites({ values: values, intl: this.props.intl }));
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
    handleToggleLoa: function () {
      dispatch(toggleLoa());
    },
    handleSetOrdered: function (ordered) {
      dispatch(setOrdered(ordered));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InviteForm);
