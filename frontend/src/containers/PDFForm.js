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
import { sendPDFForm } from "slices/PDFForms";
import { disablePolling, enablePolling } from "slices/Poll";
import { hidePDFForm } from "slices/PDFForms";
import { setActiveId } from "slices/Overlay";
import { isNotInviting } from "slices/InviteForm";
import { preparePDF } from "components/utils";

const mapStateToProps = (state, props) => {
  const doc = state.pdfform.document;
  let docFile = null,
      docName = '',
      show = false;
  if (doc !== null) {
    docFile = preparePDF(doc);
    docName = doc.name;
    show = true;
  }
  return {
    show: show,
    doc: doc,
    docName: docName,
    docFile: docFile,
    size: state.main.size,
    templates: state.template.documents,
    documents: state.documents.documents,
    owned: state.main.owned_multisign,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSendPDFForm: async function () {
      await this.collectValues();
      const form = this.state.formRef.current;
      if (!form.isValid) {
        document.querySelector("#pdf-form-modal > .modal-content > .modal-header").scrollIntoView({behaviour: 'smooth'});
        return;
      }
      const newname = form.values.newfname;
      dispatch(isNotInviting());
      dispatch(disablePolling());
      await dispatch(sendPDFForm({ doc: this.props.doc, values: this.state.values, newname: newname, intl: this.props.intl }));
      dispatch(unsetSpinning());
    },
    handleClose: function () {
      dispatch(hidePDFForm());
      dispatch(unsetSpinning());
      dispatch(enablePolling());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(PDFForm);
