/**
 * @module slices/Main
 * @desc Here we define the initial state for the main key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The main key of the Redux state holds the following subkeys:
 *
 * - loading: to indicate whether the app is loading or has finished loading.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { getRequest, checkStatus, extractCsrfToken } from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
 */
export const fetchConfig = createAsyncThunk(
  "main/fetchConfig",
  async (arg, thunkAPI) => {
    try {
      const response = await fetch("/sign/config", getRequest);
      const configData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, configData);
      thunkAPI.dispatch(mainSlice.actions.appLoaded());
      return configData;
    } catch (err) {
      console.log(err);
      thunkAPI.dispatch(addNotification("XXX TODO"));
      thunkAPI.rejectWithValue(err.toString());
    }
  }
);

const mainSlice = createSlice({
  name: "main",
  initialState: {
    loading: false,
    csrf_token: null,
    signer_attributes: undefined,
    signingData: {},
    size: 'lg',
  },
  reducers: {
    /**
     * @public
     * @function appLoaded
     * @desc Redux action to set the loading key to false to indicate that the app has finished loading.
     */
    appLoaded(state) {
      state.loading = false;
    },
    /**
     * @public
     * @function setCsrfToken
     * @desc Redux action to keep the csrf token in the state
     */
    setCsrfToken(state, action) {
      state.csrf_token = action.payload;
    },
    /**
     * @public
     * @function updateSigningForm
     * @desc Redux action to pass input values to the signing form
     */
    updateSigningForm(state, action) {
      state.signingData = action.payload;
    },
    /**
     * @public
     * @function resizeWindow
     * @desc Redux action to set the window size in the state
     */
    resizeWindow(state) {
      state.size = window.innerWidth > 1200 ? 'lg' : 'sm';
    },
  },
  extraReducers: {
    [fetchConfig.fulfilled]: (state, action) => {
      state.signer_attributes = action.payload.payload.signer_attributes;
    },
  },
});

export const { appLoaded, setCsrfToken, updateSigningForm, resizeWindow } = mainSlice.actions;

export default mainSlice.reducer;
