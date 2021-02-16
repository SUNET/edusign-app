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
    documentId: null
  },
  reducers: {
    /**
     * @public
     * @function startInviting
     * @desc Redux action to open the multi sign invite form
     */
    startInviting(state, action) {
      state.documentId = action.payload;
    },
    /**
     * @public
     * @function stopInviting
     * @desc Redux action to close the multi sign invite form
     */
    stopInviting(state) {
      state.documentId = null;
    },
  }
});

export const {
  startInviting,
  stopInviting,
} = invitesSlice.actions;

export default invitesSlice.reducer;

