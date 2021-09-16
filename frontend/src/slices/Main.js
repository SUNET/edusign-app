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

import {
  getRequest,
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
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

/**
 * @public
 * @function getPartiallySignedDoc
 * @desc Redux async thunk to get from the backend a partially signed multisign doc
 */
export const getPartiallySignedDoc = createAsyncThunk(
  "documents/getPartiallySignedDoc",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const oldDoc = state.main[args.stateKey].filter((doc) => {
      doc.key === args.key;
    });
    if (oldDoc.blob) {
      return args;
    }
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await fetch("/sign/get-partially-signed", {
        ...postRequest,
        body: body,
      });
      let data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      data.key = args.key;
      data.stateKey = args.stateKey;
      return data;
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem fetching document from the backend ",
            id: "problem-fetching-document",
          }),
        })
      );
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
    multisign_buttons: "yes",
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
    /**
     * @public
     * @function setInvitedSigning
     * @desc Redux action to mark and invitee doc as being signed
     */
    setInvitedSigning(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.invite_key === action.payload) {
          return {
            ...doc,
            state: "signing",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setOwnedSigning
     * @desc Redux action to mark and invited doc as being signed
     */
    setOwnedSigning(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            state: "signing",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideInvitedPreview
     * @desc Redux action to hide the previewed document
     */
    hideInvitedPreview(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            show: false,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideOwnedPreview
     * @desc Redux action to hide the owned previewed document
     */
    hideOwnedPreview(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            show: false,
          };
        } else return doc;
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
    [getPartiallySignedDoc.fulfilled]: (state, action) => {
      state[action.payload.stateKey] = state[action.payload.stateKey].map(
        (doc) => {
          if (doc.key === action.payload.key) {
            let newDoc = { ...doc, show: true };
            if (action.payload.payload) {
              newDoc.blob =
                "data:application/pdf;base64," + action.payload.payload.blob;
            }
            return newDoc;
          } else return doc;
        }
      );
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
  setInvitedSigning,
  setOwnedSigning,
  hideInvitedPreview,
  hideOwnedPreview,
} = mainSlice.actions;

export default mainSlice.reducer;
