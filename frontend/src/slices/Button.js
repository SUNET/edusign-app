/**
 * @module slices/Button
 * @desc Here we define the initial state for the bitton key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The button key of the state holds the information needed to render
 * enabled, disabled, and spinning buttons.
 */
import { createSlice } from "@reduxjs/toolkit";

const buttonSlice = createSlice({
  name: "button",
  initialState: {
    spinning: "", // empty string: all active, none spinning; button-id: all incactive, button#button-id spinning
  },
  reducers: {
    /**
     * @public
     * @function setSpinning
     * @desc Redux action to disable buttons
     */
    setSpinning(state, action) {
      state.spinning = action.payload;
    },
    /**
     * @public
     * @function unsetSpinning
     * @desc Redux action to enable buttons
     */
    unsetSpinning(state) {
      state.spinning = "";
    },
  },
});

export const { setSpinning, unsetSpinning } = buttonSlice.actions;

export default buttonSlice.reducer;
