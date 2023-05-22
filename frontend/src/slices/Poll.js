/**
 * @module slices/Poll
 * @desc Here we define the initial state for the poll key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The poll key holds state related to polling the backend.
 *
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { getRequest, checkStatus, extractCsrfToken } from "slices/fetch-utils";
import { setOwnedDocs, setInvitedDocs } from "slices/Main";

/**
 * @public
 * @function poll
 * @desc Redux async thunk to poll configuration data from the backend.
 */
export const poll = createAsyncThunk("main/poll", async (args, thunkAPI) => {
  try {
    const response = await fetch(`/${window.document.location.pathname.split('/')[1]}/poll`, getRequest);
    const state = thunkAPI.getState();
    if (state.main.disablePoll) {
      return thunkAPI.rejectWithValue("Polling disabled");
    }
    const configData = await checkStatus(response);
    extractCsrfToken(thunkAPI.dispatch, configData);
    if (configData.error) {
      return thunkAPI.rejectWithValue(configData.message);
    } else {
      const currentOwned = [];
      const allOwned = state.main.owned_multisign.map((owned) => {
        currentOwned.push(owned.name);
        if (owned.pending.length > 0) {
          const ownedCopy = { ...owned };
          configData.payload.owned_multisign.forEach((newOwned) => {
            if (ownedCopy.name === newOwned.name) {
              ownedCopy.pending = newOwned.pending;
              ownedCopy.signed = newOwned.signed;
              ownedCopy.declined = newOwned.declined;
            }
          });
          if (ownedCopy.pending.length === 0) ownedCopy.state = "loaded";
          return ownedCopy;
        }
        return owned;
      });
      if (configData.payload.owned_multisign.length > currentOwned.length) {
        configData.payload.owned_multisign.forEach((newOwned) => {
          if (!currentOwned.includes(newOwned.name)) {
            allOwned.push(newOwned);
          }
        });
      }
      thunkAPI.dispatch(setOwnedDocs(allOwned));
      delete configData.payload.owned_multisign;

      const currentInvited = [];
      const allInvited = state.main.pending_multisign.map((invited) => {
        currentInvited.push(invited.name);
        const invitedCopy = { ...invited };
        configData.payload.pending_multisign.forEach((newInvited) => {
          if (invitedCopy.name === newInvited.name) {
            invitedCopy.pending = newInvited.pending;
            invitedCopy.signed = newInvited.signed;
            invitedCopy.declined = newInvited.declined;
          }
        });
        return invitedCopy;
      });
      if (configData.payload.pending_multisign.length > currentInvited.length) {
        configData.payload.pending_multisign.forEach((newInvited) => {
          if (!currentInvited.includes(newInvited.name)) {
            allInvited.push(newInvited);
          }
        });
      }
      thunkAPI.dispatch(setInvitedDocs(allInvited));
      delete configData.payload.pending_multisign;

      return configData;
    }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.toString());
  }
});

const pollSlice = createSlice({
  name: "poll",
  initialState: {
    poll: false,
    disablePoll: false,
    timerId: null,
  },
  reducers: {
    /**
     * @public
     * @function setPolling
     * @desc Redux action to set the polling state
     */
    setPolling(state, action) {
      state.poll = action.payload;
    },
    /**
     * @public
     * @function enablePolling
     * @desc Redux action to enable polling
     */
    enablePolling(state, action) {
      state.disablePoll = false;
      state.poll = true;
    },
    /**
     * @public
     * @function disablePolling
     * @desc Redux action to disable polling
     */
    disablePolling(state, action) {
      clearTimeout(state.timerId);
      state.timerId = null;
      state.disablePoll = true;
    },
    /**
     * @public
     * @function setTimerId
     * @desc Redux action to keep track of polling timers
     */
    setTimerId(state, action) {
      state.timerId = action.payload;
    },
  },
  extraReducers: {
    [poll.fulfilled]: (state, action) => {
      if (!state.disablePoll) {
        return {
          ...state,
          ...action.payload.payload,
        };
      }
    },
  },
});

export const { setPolling, enablePolling, disablePolling, setTimerId } =
  pollSlice.actions;

export default pollSlice.reducer;
