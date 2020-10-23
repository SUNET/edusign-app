/**
 * @module slices/Main
 * @desc Here we define the initial state for the main key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The main key of the Redux state holds the following subkeys:
 * 
 * - loading: to indicate whether the app is loading or has finished loading.
 */
import { createSlice } from "@reduxjs/toolkit";

const mainSlice = createSlice({
  name: "main",
  initialState: {
    loading: false,
  },
  reducers: {
    /**
     * @public
     * @function appLoaded
     * @desc Redux action to set the loading key to false to indicate that the app has finished loading.
     */
    appLoaded(state, action) {
      state.loading = false;
    },
  },
});

export const { appLoaded } = mainSlice.actions;

export default mainSlice.reducer;
