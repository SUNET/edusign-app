/**
 * @module slices/PDFForms
 * @desc Here we define the initial state for the forms key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

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
    const docToSend = {
      name: doc.name,
      blob: doc.blob,
    };
    const body = JSON.stringify({ payload: docToSend });
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
      return thunkAPI.rejectWithValue(doc);
    }
    // If the response from the backend indicates no errors (by having a `payload` key)
    // update its data in the redux store,
    // and if there are errors, also update its data with the error.
    if ("payload" in data) {
      thunkAPI.dispatch(pdfFormSlice.actions.addSchema(data.payload.schema));
      thunkAPI.dispatch(showPDFForm());
      return
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
 * @function getPDFWithFormFilled
 * @desc Redux async thunk that sends a document (template) with a PDF form,
  * and the values that the user has entered in the html form constructed from
  * the schema of the PDF form, to receive back a PDF with the PDF form
  * filled with the provided values.
 */
export const getPDFWithFormFilled = createAsyncThunk(
  "documents/getPDFWithFormFilled",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
  }
);

const pdfformsSlice = createSlice({
  name: "pdfforms",
  initialState: {
    document: '',
    form_schema: {},
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
      state.document = '';
      state.form_schema = {};
    },
  },
  extraReducers: {
    [getPDFForm.rejected]: (state, action) => {
      state.document = '';
      state.form_schema = {};
    },
  },
});

export const { clearPDFForm, addDocument, addSchema } = pdfformsSlice.actions;

export default pdfformsSlice.reducer;
