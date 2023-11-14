/**
 * @module containers/DelegateForm
 * @desc In this module we connect the DelegateForm component with the Redux store.
 */
import { connect } from "react-redux";

import DelegateForm from "components/DelegateForm";

import { delegateSignature, stopDelegating } from "slices/Main";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
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
    mail_aliases: state.main.signer_attributes.mail_aliases,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values) {
      await dispatch(delegateSignature({ values: values, intl: props.intl }));
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(unsetActiveId());
      dispatch(stopDelegating());
    },
    handleClose: function (key) {
      return () => {
        dispatch(unsetSpinning());
        dispatch(enablePolling());
        dispatch(unsetActiveId());
        dispatch(stopDelegating(key));
      };
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DelegateForm);
