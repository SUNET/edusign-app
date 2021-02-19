/**
 * @module slices/Invites
 * @desc Here we define the initial state for the invites key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The invites key of the Redux state holds the following subkeys:
 *
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
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
        blob: document.blob,
        size: document.size,
        type: document.type,
      }
    };
    console.log("preparing document", dataToSend);
    const body = preparePayload(thunkAPI.getState(), dataToSend);
    let data = null;
    let document = null;
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
      document = {
        ...document,
        state: "failed-multi-signing",
        message: "XXX Problem creating multi sign request, please try again",
      };
    }
    if ("payload" in data) {
      const updatedDoc = {
        ...document,
        ...data.payload,
        state: "multi-signing",
      };
      return updatedDoc;
    }
    let msg = "XXX XXX Problem creating multi sign request, please try again";
    if ("message" in data) {
      msg = data.message;
    }
    return {
      ...document,
      state: "failed-multi-signing",
      message: msg,
    };




  }
);

const inviteSlice = createSlice({
  name: "invites",
  initialState: {
    showForm: false,
    documentId: null,
    invitees: [{name: '', email: ''}],
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
  extraReducers: {
    [sendInvites.fulfilled]: () => {
      return {
        showForm: false,
        documentId: null,
        invitees: [{name: '', email: ''}],
      };
    },
  },
});

export const {
  closeInviteForm,
  openInviteForm,
  updateInvitees,
} = inviteSlice.actions;

export default inviteSlice.reducer;
