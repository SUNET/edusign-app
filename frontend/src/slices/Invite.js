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
    await new Promise((resolve) => {
      const state = thunkAPI.getState();
      setTimeout(() => {
        const data = {
          documentId: state.invites.documentId,
          invitees: state.invites.invitees,
        };
        console.log("Sending invites", data);
        resolve();
      }, 500);
    });
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
    [sendInvites.fulfilled]: (state, action) => {
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
