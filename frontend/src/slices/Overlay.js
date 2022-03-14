/**
 * @module slices/Overlay
 * @desc Here we define the initial state for the overlay key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const overlaySlice = createSlice({
  name: "overlay",
  initialState: {
    active: "",
    previous: "",
  },
  reducers: {
    /**
     * @public
     * @function setActiveId
     * @desc Redux action to show an overlay
     */
    setActiveId(state, action) {
      state.previous = state.active;
      state.active = action.payload;
    },
    /**
     * @public
     * @function unsetActiveId
     * @desc Redux action to unshow an overlay
     */
    unsetActiveId(state, action) {
      state.active = state.previous;
      state.previous = "";
    },
  },
});

export const { setActiveId, unsetActiveId } = overlaySlice.actions;

export default overlaySlice.reducer;
