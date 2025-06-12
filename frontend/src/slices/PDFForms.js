/**
 * @module slices/PDFForms
 * @desc Here we define the initial state for the forms key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";


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
