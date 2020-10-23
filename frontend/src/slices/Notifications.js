/**
 * @module slices/Notifications
 * @desc Here we define the initial state for the notifications key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The notifications key in the Redux store is used to hold any message that the app
 * may want to show to the user.
 *
 * A notification is an object with 2 keys, `level`, which can be "danger" or "success",
 * and `message`, which can be any text.
 */
import { createSlice } from "@reduxjs/toolkit";

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notification: {},
  },
  reducers: {
    /**
     * @public
     * @function addNotification
     * @desc Redux action to add a notification to the notifications state key.
     * This notification will show in the notifications area of the header.
     */
    addNotification(state, action) {
      state.notification = action.payload;
    },
    /**
     * @public
     * @function rmNotification
     * @desc Redux action to remove a notification to the notifications state key.
     * This will clear the notifications area of the header.
     */
    rmNotification(state, action) {
      state.notification = {};
    },
  },
});

export const { addNotification, rmNotification } = notificationsSlice.actions;

export default notificationsSlice.reducer;
