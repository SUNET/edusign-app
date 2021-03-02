/**
 * @module slices/Invited
 * @desc Here we define the initial state for the invited key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { getRequest, checkStatus, extractCsrfToken } from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";

/**
 * @public
 * @function startMultisignRequest
 * @desc Redux async thunk to start signing a document the user has been invited to sign.
 */
export const startMultisignRequest = createAsyncThunk(
  "invited/startMultisignRequest",
  async (arg, thunkAPI) => {
    try {
      const response = await fetch("/u/start-multisign?document" + arg, getRequest);
      const configData = await checkStatus(response);
        //  XXX  follow redirect
    } catch (err) {
      console.log("Error fetching config", err);
      thunkAPI.dispatch(addNotification("XXX TODO"));
    }
  }
);

const invitedSlice = createSlice({
  name: "invited",
  initialState: {
      document: null,
  },
  extraReducers: {
    [startMultisignRequest.fulfilled]: (state) => {
      return {
        ...state,
      }
    },
  },
});

export default invitedSlice.reducer;

