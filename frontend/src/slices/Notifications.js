import { createSlice } from "@reduxjs/toolkit";

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notification: {},
  },
  reducers: {
    addNotification(state, action) {
      state.notification = action.payload;
    },
    rmNotification(state, action) {
      state.notification = {};
    },
  },
});

export const { addNotification, rmNotification } = notificationsSlice.actions;

export default notificationsSlice.reducer;
