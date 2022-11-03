/**
 * @module containers/PDFForm
 * @desc In this module we connect the PDFForm component with the Redux store.
 *
 * In mapStateToProps we take a few keys from the central store
 * and assign them to the props of the component.
 *
 * in mapDispatchToProps we compose the event handlers making use
 * of the Redux dispatch function.
 */
import { connect } from "react-redux";

import PDFForm from "components/PDFForm";

import { unsetSpinning } from "slices/Button";
import { hidePDFForm } from "slices/Templates";
import { sendPDFForm } from "slices/PDFForms";

const mapStateToProps = (state, props) => {
  return {
    size: state.main.size,
    templates: state.template.documents,
    documents: state.documents.documents,
    owned: state.main.owned_multisign,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values, props) {
      await dispatch(sendPDFForm({ values: values, intl: props.intl }));
      dispatch(unsetSpinning());
      dispatch(hidePDFForm());
    },
    handleClose: function (key) {
      return () => {
        dispatch(unsetSpinning());
        dispatch(hidePDFForm(key));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(PDFForm);
