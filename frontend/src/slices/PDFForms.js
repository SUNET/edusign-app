/**
 * @module slices/PDFForms
 * @desc Here we define the initial state for the forms key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { setState } from "slices/Documents";
import { showForm } from "slices/Modals";
import { disablePolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";
import { setActiveId } from "slices/Overlay";
import { isNotInviting } from "slices/InviteForm";
import { addNotification } from "slices/Notifications";

/**
 * @public
 * @function getPDFForm
 * @desc Redux async thunk that sends a document (template) with a PDF form,
 * receives a schema of the form, and displays an html form based on that schema.
 */
export const getPDFForm = createAsyncThunk(
  "documents/getPDFForm",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    // Gather document data and send it to the backend
    // to get back the schema of the form in the document.
    const doc = args.doc;
    thunkAPI.dispatch(pdfFormSlice.actions.addDocument(doc));

    const docToSend = {
      document: doc.blob,
    };
    const body = preparePayload(state, docToSend);
    let data = null;
    try {
      const response = await fetch("/sign/get-form", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem getting PDF form, please try again",
            id: "problem-getting-pdf-form",
          }),
        })
      );
      return thunkAPI.rejectWithValue(err);
    }
    // If the response from the backend indicates no errors (by having a `payload` key)
    // update its data in the redux store,
    // and if there are errors, also update its data with the error.
    if ("payload" in data) {
      thunkAPI.dispatch(pdfFormSlice.actions.addSchema(data.payload.fields));
      thunkAPI.dispatch(pdfFormSlice.actions.showPDFForm());
      return;
    }
    let msg = args.intl.formatMessage({
      defaultMessage: "Problem getting PDF form, please try again",
      id: "problem-getting-pdf-form",
    });
    if ("message" in data) {
      msg = data.message;
    }
    thunkAPI.dispatch(
      addNotification({
        level: "danger",
        message: msg,
      })
    );
    return thunkAPI.rejectWithValue(doc);
  }
);

/**
 * @public
 * @function sendPDFForm
 * @desc Redux async thunk that sends a document (template) with a PDF form,
 * and the values that the user has entered in the html form constructed from
 * the schema of the PDF form, to receive back a PDF with the PDF form
 * filled with the provided values.
 */
export const sendPDFForm = createAsyncThunk(
  "documents/sendPDFForm",
  async (args, thunkAPI) => {
    const fields = args.values.fields;
    const state = thunkAPI.getState();
    const doc = state.pdfform.document;
    const newName = args.values.newname;

    const dataToSend = {
      document: doc.blob,
      fields: fields,
    };
    const body = JSON.stringify({ payload: dataToSend });
    let data = null;
    try {
      const response = await fetch("/sign/update-form", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem filling in PDF form, please try again",
            id: "problem-updating-pdf-form",
          }),
        })
      );
      return thunkAPI.rejectWithValue(doc);
    }
    if (data.error) {
      let msg = args.intl.formatMessage({
        defaultMessage: "Problem filling in PDF form, please try again",
        id: "problem-updating-pdf-form",
      });
      if ("message" in data) {
        msg = data.message;
      }
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: msg,
        })
      );
      return thunkAPI.rejectWithValue(doc);
    }

    const newDoc = {
      ...doc,
      name: newName,
      blob: data.payload.document,
    };
    await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));
    thunkAPI.dispatch(setState({ name: newName, state: "loaded" }));

    // The previously gotten state is out of date by now
    state = thunkAPI.getState();
    const newDocument = state.documents.documents.filter((doc) => {
      return doc.name === newName;
    })[0];

    thunkAPI.dispatch(isNotInviting());
    thunkAPI.dispatch(disablePolling());
    thunkAPI.dispatch(setActiveId("dummy-help-id"));
    thunkAPI.dispatch(showForm(newDocument.id));
    thunkAPI.dispatch(unsetSpinning());
  }
);

const pdfFormSlice = createSlice({
  name: "pdfforms",
  initialState: {
    document: {},
    form_schema: {},
    show: false,
  },
  reducers: {
    /**
     * @public
     * @function addDocument
     * @desc Redux action to store the document with the form to fill
     */
    addDocument(state, action) {
      state.document = action.payload;
    },
    /**
     * @public
     * @function addSchema
     * @desc Redux action to keep the schema for the form to fill,
     * received from the backend
     */
    addSchema(state, action) {
      state.form_schema = action.payload;
    },
    /**
     * @public
     * @function clearPDFForm
     * @desc Redux action to forget about a process of filling in a pdf form
     */
    clearPDFForm(state, action) {
      state.document = {};
      state.form_schema = {};
    },
    /**
     * @public
     * @function showPDFForm
     * @desc Redux action to show the form to fill in a pdf form
     */
    showPDFForm(state, action) {
      state.show = true;
    },
    /**
     * @public
     * @function hidePDFForm
     * @desc Redux action to forget about a process of filling in a pdf form
     */
    hidePDFForm(state, action) {
      state.show = false;
    },
  },
  extraReducers: {
    [getPDFForm.rejected]: (state, action) => {
      state.document = {};
      state.form_schema = {};
    },
  },
});

export const {
  clearPDFForm,
  addDocument,
  addSchema,
  hidePDFForm,
  showPDFForm,
} = pdfFormSlice.actions;

export default pdfFormSlice.reducer;
