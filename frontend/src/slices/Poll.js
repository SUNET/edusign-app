/**
 * @module slices/Poll
 * @desc Here we define the initial state for the poll key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The poll key holds state related to polling the backend.
 *
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import {
  getRequest,
  checkStatus,
  extractCsrfToken,
  esFetch,
} from "slices/fetch-utils";
import { setOwnedDocs, setInvitedDocs, removeOwned } from "slices/Main";
import { addDocumentToDb, addDocument } from "slices/Documents";

/**
 * @public
 * @function poll
 * @desc Redux async thunk to poll configuration data from the backend.
 */
export const poll = createAsyncThunk("main/poll", async (args, thunkAPI) => {
  try {
    const response = await esFetch("/sign/poll", getRequest);
    const state = thunkAPI.getState();
    if (!state.main.signer_attributes.eppn) {
      return thunkAPI.rejectWithValue("Not ready to poll");
    }
    if (state.main.disablePoll) {
      return thunkAPI.rejectWithValue("Polling disabled");
    }
    const configData = await checkStatus(response);
    extractCsrfToken(thunkAPI.dispatch, configData);
    if (configData.error) {
      return thunkAPI.rejectWithValue(configData.message);
    } else {
      const newOwnedNames = configData.payload.owned_multisign.map(
        (owned) => owned.name,
      );
      const currentOwnedNames = [];
      let allOwned = state.main.owned_multisign.filter((owned) =>
        newOwnedNames.includes(owned.name),
      );
      allOwned = allOwned.map((owned) => {
        currentOwnedNames.push(owned.name);
        if (owned.pending.length > 0) {
          const ownedCopy = { ...owned };
          configData.payload.owned_multisign.forEach((newOwned) => {
            if (ownedCopy.name === newOwned.name) {
              ownedCopy.pending = newOwned.pending;
              ownedCopy.signed = newOwned.signed;
              ownedCopy.declined = newOwned.declined;
              ownedCopy.sendsigned = newOwned.sendsigned;
              ownedCopy.skipfinal = newOwned.skipfinal;
              ownedCopy.pprinted = newOwned.pprinted;
            }
          });
          if (ownedCopy.pending.length === 0) ownedCopy.state = "loaded";
          return ownedCopy;
        }
        return owned;
      });

      configData.payload.owned_multisign.forEach((newOwned) => {
        if (!currentOwnedNames.includes(newOwned.name)) {
          allOwned.push(newOwned);
        }
      });
      thunkAPI.dispatch(setOwnedDocs(allOwned));

      await configureSkipped(thunkAPI, configData, state.main.owned_multisign);

      delete configData.payload.owned_multisign;

      const newInvitedNames = configData.payload.pending_multisign.map(
        (invited) => invited.name,
      );
      const currentInvitedNames = [];
      let allInvited = state.main.pending_multisign.filter(
        (invited) =>
          newInvitedNames.includes(invited.name) || invited.state === "signed",
      );
      allInvited = allInvited.map((invited) => {
        currentInvitedNames.push(invited.name);
        const invitedCopy = { ...invited };
        configData.payload.pending_multisign.forEach((newInvited) => {
          if (invitedCopy.name === newInvited.name) {
            invitedCopy.pending = newInvited.pending;
            invitedCopy.signed = newInvited.signed;
            invitedCopy.declined = newInvited.declined;
            invitedCopy.sendsigned = newInvited.sendsigned;
            invitedCopy.skipfinal = newInvited.skipfinal;
            invitedCopy.pprinted = newInvited.pprinted;
          }
        });
        return invitedCopy;
      });
      configData.payload.pending_multisign.forEach((newInvited) => {
        if (!currentInvitedNames.includes(newInvited.name)) {
          allInvited.push(newInvited);
        }
      });
      thunkAPI.dispatch(setInvitedDocs(allInvited));
      delete configData.payload.pending_multisign;

      return configData;
    }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.toString());
  }
});

export const configureSkipped = async (thunkAPI, configData, owned) => {
  const state = thunkAPI.getState();
  for (const oldDoc of owned) {
    for (const doc of configData.payload.skipped) {
      if (doc.key === oldDoc.key) {
        let newSigned = [...doc.signed];
        let newDeclined = [...doc.declined];
        let prefix = "data:application/xml;base64,";
        if (oldDoc.type === "application/pdf") {
          prefix = "data:application/pdf;base64,";
        }
        const signedContent = prefix + doc.signed_content;
        let newDoc = {
          ...oldDoc,
          signedContent: signedContent,
          blob: signedContent,
          state: "signed",
          show: false,
          showForced: false,
          signed: newSigned,
          declined: newDeclined,
          pending: doc.pending,
          pprinted: doc.pprinted,
        };
        delete newDoc.ordered;
        delete newDoc.sendsigned;
        delete newDoc.skipfinal;
        newDoc = await addDocumentToDb(
          newDoc,
          state.main.signer_attributes.eppn,
          thunkAPI
        );
        thunkAPI.dispatch(addDocument(newDoc));
        thunkAPI.dispatch(removeOwned({ key: doc.key }));
      }
    }
  }
};

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
  extraReducers: (builder) => {
    builder.addCase(poll.fulfilled, (state, action) => {
      if (!state.disablePoll) {
        return {
          ...state,
          ...action.payload.payload,
        };
      }
    });
  },
});

export const { setPolling, enablePolling, disablePolling, setTimerId } =
  pollSlice.actions;

export default pollSlice.reducer;
