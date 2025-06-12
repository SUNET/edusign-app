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
import { sendPDFForm, hidePDFForm } from "slices/PDFForms";
import { disablePolling, enablePolling } from "slices/Poll";
import { isNotInviting } from "slices/InviteForm";
import { docToFile, uint8ArrayToBase64 } from "components/utils";
import { createDocument, addDocument } from "slices/Documents";

const mapStateToProps = (state, props) => {
  const doc = state.pdfform.document;
  let docFile = null,
    docName = "",
    show = false;
  if (doc !== null) {
    docFile = docToFile(doc);
    docName = doc.name;
    show = true;
  }
  return {
    show: show,
    doc: doc,
    docFile: docFile,
    docName: docName,
    size: state.main.size,
    templates: state.template.documents,
    documents: state.documents.documents,
    owned: state.main.owned_multisign,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleSendPDFForm: async function () {
      const form = this.state.formRef.current;
      if (!form.isValid) {
        document
          .querySelector("#pdf-form-modal > .modal-content > .modal-header")
          .scrollIntoView({ behavior: "smooth" });
        return;
      }
      const newName = form.values.newfname;
      
      const byteArray = await this.state.docRef.current.linkService.current.pdfDocument.saveDocument();
      const docSize = byteArray.length;
      const b64doc = await uint8ArrayToBase64(pdfData);
      dispatch(isNotInviting());

      const newDoc = {
        name: newName,
        size: docSize,
        type: 'appication/pdf',
        blob: b64doc,
        created: Date.now(),
        state: "loading",
      };
      dispatch(addDocument(newDoc));
      await dispatch(createDocument({ doc: newDoc, intl: this.props.intl }));

      dispatch(unsetSpinning());
      //this.restoreValues();
    },
    handleClose: function () {
      dispatch(hidePDFForm());
      dispatch(unsetSpinning());
      dispatch(enablePolling());
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(PDFForm);
