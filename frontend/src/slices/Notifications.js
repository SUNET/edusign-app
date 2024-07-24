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
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/**
 * @public
 * @function addNotification
 * @desc Redux async thunk to show transient notification
 * This notification will show in the notifications area of the header.
 */
export const addNotification = createAsyncThunk(
  "main/addNotification",
  async (arg, thunkAPI) => {
    window.setTimeout(() => {
      thunkAPI.dispatch(notificationsSlice.actions.rmNotification());
    }, 5000);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    return arg;
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    message: null,
  },
  reducers: {
    /**
     * @public
     * @function rmNotification
     * @desc Redux action to remove a notification to the notifications state key.
     * This will clear a message from the notifications area of the header.
     */
    rmNotification(state) {
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addNotification.fulfilled, (state, action) => {
      state.message = action.payload;
    });
  },
});

export const { rmNotification } = notificationsSlice.actions;

export default notificationsSlice.reducer;
