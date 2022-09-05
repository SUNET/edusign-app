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
import { hidePDFForm, sendPDFForm } from "slices/PDFForms";

const mapStateToProps = (state, props) => {
  let show = false;
  if (state.pdfform.form_schema) {
    show = true;
  }
  return {
    size: state.main.size,
    show: show,
    doc: state.pdfform.document,
    form: state.pdfform.form_schema,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSubmit: async function (values, props) {
      await dispatch(sendPDFForm({ values: values, intl: props.intl }));
      dispatch(unsetSpinning());
      dispatch(hidePDFForm());
    },
    handleClose: function () {
      dispatch(unsetSpinning());
      dispatch(hidePDFForm());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(PDFForm);

