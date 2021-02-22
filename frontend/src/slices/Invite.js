/**
 * @module slices/Invites
 * @desc Here we define the initial state for the invites key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The invites key of the Redux state holds the following subkeys:
 *
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import {
  checkStatus,
  extractCsrfToken,
  postRequest,
  preparePayload,
} from "slices/fetch-utils";
import { addOwned } from "slices/Main";
import { removeDocument } from "slices/Documents";
import { addNotification } from "slices/Notifications";


/**
 * @public
 * @function sendInvites
 * @desc Redux async thunk to create multi sign requests
 */
export const sendInvites = createAsyncThunk(
  "main/sendInvites",
  async (arg, thunkAPI) => {
    const state = thunkAPI.getState();
    const documentId = state.invites.documentId;
    const invitees = state.invites.invitees;

    const document = state.documents.documents.filter((doc) => {
      return doc.id === documentId;
    })[0];

    const owner = state.main.signer_attributes.filter((attr) => {
      return attr.name === 'mail';
    })[0].value;

    const dataToSend = {
      owner: owner,
      invites: invitees,
      document: {
        name: document.name,
        blob: document.blob.split(',')[1],
        size: document.size,
        type: document.type,
      }
    };
    console.log("preparing document", dataToSend);
    const body = preparePayload(thunkAPI.getState(), dataToSend);
    let data = null;
    try {
      console.log("Using fetch to post to create-multi-sign", body);
      const response = await fetch("/sign/create-multi-sign", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      console.log("And got data", data);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      console.log("Problem sending document for multi signing", err);
      const message = "XXX Problem sending multi sign request, please try again";
      thunkAPI.dispatch(addNotification({level: 'danger', message: message}));
      return;
    }
    if (data.error) {
      console.log("Problem creating document for multi signing", err);
      const message = "XXX Problem creating multi sign request, please try again";
      thunkAPI.dispatch(addNotification({level: 'danger', message: message}));
      return;
    }
    const owned = {
      key: document.key,
      name: document.name,
      size: document.size,
      type: document.type,
      pending: invitees,
      signed: [],
    };
    thunkAPI.dispatch(addOwned(owned));
    thunkAPI.dispatch(removeDocument(document.name));
  }
);

const inviteSlice = createSlice({
  name: "invites",
  initialState: {
    showForm: false,
    documentId: null,
    invitees: [{name: '', email: ''}],
    owned: [],
    invited: [],
  },
  reducers: {
    closeInviteForm(state) {
      return {
        ...state,
        showForm: false,
      }
    },
    openInviteForm(state, action) {
      const newState = {
        ...state,
        showForm: true,
        documentId: action.payload
      }
      if (state.documentId !== action.payload) {
        return {
          ...newState,
          invitees: [{name: '', email: ''}]
        };
      }
      return newState;
    },
    updateInvitees(state, action) {
      return {
        ...state,
        invitees: action.payload
      }
    },
  },
  extra_reducers: {

    [sendInvites.fulfilled]: (state, action) => {
      dbSaveDocument(action.payload);
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
          };
        } else return doc;
      });
    },
  }
});

export const {
  closeInviteForm,
  openInviteForm,
  updateInvitees,
} = inviteSlice.actions;

export default inviteSlice.reducer;
