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
import { createIntl } from "react-intl";

import { getRequest, checkStatus, extractCsrfToken } from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { loadDocuments } from "slices/Documents";

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
 */
export const fetchConfig = createAsyncThunk(
  "main/fetchConfig",
  async (args, thunkAPI) => {
    let intl;
    if (args === undefined) {
      const state = thunkAPI.getState();
      intl = createIntl(state.intl);
    } else {
      intl = args.intl;
    }
    try {
      const response = await fetch("/sign/config", getRequest);
      const configData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, configData);
      thunkAPI.dispatch(mainSlice.actions.appLoaded());
      if (configData.error) {
        thunkAPI.dispatch(
          addNotification({ level: "danger", message: configData.message })
        );
        return thunkAPI.rejectWithValue(configData.message);
      } else {
        thunkAPI.dispatch(loadDocuments({ intl: intl }));
        return configData;
      }
    } catch (err) {
      console.log("UUH", err);
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: intl.formatMessage({
            defaultMessage: "TODO",
            id: "main-todo",
          }),
        })
      );
      return thunkAPI.rejectWithValue(err.toString());
    }
  }
);

const mainSlice = createSlice({
  name: "main",
  initialState: {
    loading: false,
    csrf_token: null,
    signer_attributes: undefined,
    owned_multisign: [],
    pending_multisign: [],
    signingData: {},
    size: "lg",
    width: 0,
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
      state.size = window.innerWidth > 1200 ? "lg" : "sm";
      state.width = window.innerWidth;
    },
    /**
     * @public
     * @function addOwned
     * @desc Redux action to add an owned multisign request
     */
    addOwned(state, action) {
      state.owned_multisign.push(action.payload);
    },
    /**
     * @public
     * @function removeOwned
     * @desc Redux action to add an owned multisign request
     */
    removeOwned(state, action) {
      state.owned_multisign = state.owned_multisign.filter((doc) => {
        return doc.key !== action.payload.key;
      });
    },
  },
  extraReducers: {
    [fetchConfig.fulfilled]: (state, action) => {
      return {
        ...state,
        ...action.payload.payload,
      };
    },
    [fetchConfig.rejected]: (state, action) => {
      return {
        ...state,
        signer_attributes: null,
      };
    },
  },
});

export const {
  appLoaded,
  setCsrfToken,
  updateSigningForm,
  resizeWindow,
  addOwned,
  removeOwned,
} = mainSlice.actions;

export default mainSlice.reducer;
