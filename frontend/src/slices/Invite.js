/**
 * @module slices/Invites
 * @desc Here we define the initial state for the invites key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The invites key of the Redux state holds the following subkeys:
 *
 */
import { createSlice } from "@reduxjs/toolkit";

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
      return {
        ...state,
        showForm: true,
        documentId: action.payload
      }
    },
  }
});

export const {
  closeInviteForm,
  openInviteForm,
} = inviteSlice.actions;

export default inviteSlice.reducer;
