/**
 * @module slices/Invites
 * @desc Here we define the initial state for the invites key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The invites key of the Redux state holds the following subkeys:
 *
 */
import { createSlice } from "@reduxjs/toolkit";

const invitesSlice = createSlice({
  name: "invites",
  initialState: {
    showForm: false,
    documentId: null,
    invites: [
      {
        name: '',
        email: '',
      },
    ],
  },
  reducers: {
    /**
     * @public
     * @function openInviteForm
     * @desc Redux action to open the multi sign invite form
     */
    openInviteForm(state, action) {
      if (state.documentId !== action.payload) {
        return {
          showForm: true,
          documentId: action.payload,
          invites: [{
            name: '',
            email: ''
          }]
        }
      }
    },
    /**
     * @public
     * @function softCloseInviteForm
     * @desc Redux action to close the multi sign invite form keeping invites
     */
    softCloseInviteForm(state, action) {
      return {
        ...state,
        showForm: false,
        invites: action.payload,
      }
    },
    /**
     * @public
     * @function hardCloseInviteForm
     * @desc Redux action to close the multi sign invite form w/o keeping invites
     */
    hardCloseInviteForm(state) {
      return {
        ...state,
        invites: [{
          name: '',
          email: ''
        }],
        showForm: false,
      }
    },
  }
});

export const {
  openInviteForm,
  softCloseInviteForm,
  hardCloseInviteForm,
} = invitesSlice.actions;

export default invitesSlice.reducer;

