/**
 * @module slices/InviteForm
 * @desc Here we keep some state related to the invite form, in the invite key of the tredux store,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const inviteFormSlice = createSlice({
  name: "inviteform",
  initialState: {
    show_loa_selection: false,
  },
  reducers: {
    /**
     * @public
     * @function toggleLoa
     * @desc Redux action to show the widget to select required loa
     */
    toggleLoa(state) {
      state.show_loa_selection = !state.show_loa_selection;
    },
    /**
     * @public
     * @function showLoa
     * @desc Redux action to show the widget to select required loa
     */
    showLoa(state) {
      state.show_loa_selection = true;
    },
    /**
     * @public
     * @function hideLoa
     * @desc Redux action to hide the widget to select required loa
     */
    hideLoa(state) {
      state.show_loa_selection = false;
    },
  },
});

export const { toggleLoa, showLoa, hideLoa } = inviteFormSlice.actions;

export default inviteFormSlice.reducer;
