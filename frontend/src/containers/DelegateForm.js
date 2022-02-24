/**
 * @module containers/DelegateForm
 * @desc In this module we connect the DelegateForm component with the Redux store.
 */
import { connect } from "react-redux";

import DelegateForm from "components/DelegateForm";

import { delegateSignature } from "slices/Main";
import { hideForm } from "slices/Modals";
import { unsetSpinning } from "slices/Button";
import { disablePolling, enablePolling } from "slices/Poll";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.modals.show_form && state.modals.form_id === props.docId) {
    show = true;
  }
  return {
    size: state.main.size,
    show: show,
    mail: state.main.signer_attributes.mail,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values) {
      await dispatch(delegateSignature({ values: values, intl: this.props.intl }));
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(hideForm());
    },
    handleClose: function () {
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(hideForm());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DelegateForm);
