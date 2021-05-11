/**
 * @module slices/Modals
 * @desc Here we define the initial state for the Modals key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const modalsSlice = createSlice({
  name: "modals",
  initialState: {
    show_form: false,
    form_id: null,
    show_preview: false,
    preview_id: null,
  },
  reducers: {
    /**
     * @public
     * @function showForm
     * @desc Redux action to trigger opening an invite form modal
     */
    showForm(state, action) {
      state.show_form = true;
      state.form_id = action.payload;
    },
    /**
     * @public
     * @function hideForm
     * @desc Redux action to trigger hiding an invite form modal
     */
    hideForm(state) {
      state.show_form = false;
      state.form_id = null;
    },
    /**
     * @public
     * @function showPreview
     * @desc Redux action to trigger opening a document preview modal
     */
    showPreview(state, action) {
      state.show_preview = true;
      state.preview_id = action.payload;
    },
    /**
     * @public
     * @function hidePreview
     * @desc Redux action to trigger hiding a document preview modal
     */
    hidePreview(state) {
      state.show_preview = false;
      state.preview_id = null;
    },
  },
});

export const {
  showForm,
  hideForm,
  showPreview,
  hidePreview,
} = modalsSlice.actions;

export default modalsSlice.reducer;
