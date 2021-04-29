/**
 * @module slices/ConfirmDialog
 * @desc Here we define the initial state for the confirm key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const confirmSlice = createSlice({
  name: "confirm",
  initialState: {
    dummy: true,
  },
  reducers: {
    /**
     * @public
     * @function askConfirmation
     * @desc Redux action to show a confirmation dialog
     */
    askConfirmation(state, action) {
      state[action.payload] = true;
      state.dummy = !state.dummy;
    },
    /**
     * @public
     * @function closeConfirmation
     * @desc Redux action to close a confirmation dialog
     */
    closeConfirmation(state, action) {
      state[action.payload] = false;
      state.dummy = !state.dummy;
    },
  },
});

export const { askConfirmation, closeConfirmation } = confirmSlice.actions;

export default confirmSlice.reducer;
