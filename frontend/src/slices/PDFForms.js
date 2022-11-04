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
import { setState, createDocument } from "slices/Documents";
import { setTemplateFormSchema, hidePDFForm } from "slices/Templates";
import { showForm } from "slices/Modals";
import { unsetSpinning } from "slices/Button";
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
    console.log(field_values);
    let state = thunkAPI.getState();
    const doc = args.doc;
    const newName = 'new.pdf';

    const fields = [];
    for (const key in field_values) {
      fields.push( {
        name: field_values[key].name,
        value: field_values[key].value,
      });
    }
    const dataToSend = {
      document: doc.blob,
      fields: fields,
    };
    const body = preparePayload(state, dataToSend);
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
      name: newName,
      size: doc.size,
      type: doc.type,
      blob: "data:application/pdf;base64," + data.payload.document,
      created: Date.now(),
      state: "loading",
    };
    await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));
    thunkAPI.dispatch(setState({ name: newName, state: "loaded" }));

    // The previously gotten state is out of date by now
    state = thunkAPI.getState();
    const newDocument = state.documents.documents.filter((doc) => {
      return doc.name === newName;
    })[0];

    thunkAPI.dispatch(hidePDFForm(doc.key));
    thunkAPI.dispatch(showForm(newDocument.id));
    thunkAPI.dispatch(unsetSpinning());
  }
);

const pdfFormSlice = createSlice({
  name: "pdfforms",
  initialState: {
  },
  reducers: {
  },
  extraReducers: {
  },
});

export const {
} = pdfFormSlice.actions;

export default pdfFormSlice.reducer;
