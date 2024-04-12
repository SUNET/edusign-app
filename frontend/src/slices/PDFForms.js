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
  esFetch,
} from "slices/fetch-utils";
import { createDocument, addDocument } from "slices/Documents";
import { showForm } from "slices/Modals";
import { addNotification } from "slices/Notifications";

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
    const field_values = args.values;
    thunkAPI.dispatch(pdfFormSlice.actions.hidePDFForm());
    let state = thunkAPI.getState();
    const doc = args.doc;
    const newName = args.newname;

    const fields = [];
    for (const key in field_values) {
      fields.push({
        name: field_values[key].name,
        value: field_values[key].value,
      });
    }
    const dataToSend = {
      document: doc.blob,
      form_fields: fields,
    };
    const body = preparePayload(state, dataToSend);
    let data = null;
    try {
      const response = await esFetch("/sign/update-form", {
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
        }),
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
        }),
      );
      return thunkAPI.rejectWithValue(doc);
    }

    const newDoc = {
      name: newName,
      size: doc.size,
      type: doc.type,
      blob: "data:application/pdf;base64," + data.payload.document,
      created: Date.now(),
      state: "loading",
    };
    thunkAPI.dispatch(addDocument(newDoc));
    await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));
  },
);

const pdfFormSlice = createSlice({
  name: "pdfform",
  initialState: {
    document: null,
  },
  reducers: {
    /**
     * @public
     * @function showPDFForm
     * @desc Redux action to trigger opening the form of a PDF document
     */
    showPDFForm(state, action) {
      state.document = action.payload;
    },
    /**
     * @public
     * @function hidePDFForm
     * @desc Redux action to trigger closing the form of a PDF document
     */
    hidePDFForm(state, action) {
      state.document = null;
    },
  },
  extraReducers: (builder) => {},
});

export const { showPDFForm, hidePDFForm } = pdfFormSlice.actions;

export default pdfFormSlice.reducer;
