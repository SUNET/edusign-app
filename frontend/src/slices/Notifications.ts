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
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export type NotificationLevel = "danger" | "success";

export interface Notification {
  level: NotificationLevel;
  message: string;
}

export interface NotificationsState {
  message: Notification | null;
  timerId: number | null;
}

const initialState: NotificationsState = {
  message: null,
  timerId: null,
};

/**
 * @public
 * @function addNotification
 * @desc Redux async thunk to show transient notification
 * This notification will show in the notifications area, above the main content.
 */
export const addNotification = createAsyncThunk<
  { message: Notification; timerId: number },
  Notification
>("main/addNotification", (arg, thunkAPI) => {
  const timerId = window.setTimeout(() => {
    thunkAPI.dispatch(notificationsSlice.actions.rmNotification());
  }, 5000);
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  return { message: arg, timerId: timerId };
});

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /**
     * @public
     * @function rmNotification
     * @desc Redux action to remove a notification from the notifications state key.
     * This will clear the message from the notifications area.
     */
    rmNotification(state) {
      if (state.timerId !== null) {
        clearTimeout(state.timerId);
      }
      state.timerId = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      addNotification.fulfilled,
      (
        state,
        action: PayloadAction<{ message: Notification; timerId: number }>,
      ) => {
        // Cancel the removal of the notification this one replaces,
        // so that it cannot cut this one's 5 seconds short.
        if (state.timerId !== null) {
          clearTimeout(state.timerId);
        }
        state.message = action.payload.message;
        state.timerId = action.payload.timerId;
      },
    );
  },
});

export const { rmNotification } = notificationsSlice.actions;

export default notificationsSlice.reducer;
