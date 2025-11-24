/**
 * @module slices/UserInfo
 */
import { createSlice } from "@reduxjs/toolkit";

const UserInfoSlice = createSlice({
  name: "user_info",
  initialState: {
    show: false,
  },
  reducers: {
    /**
     * @public
     * @function showUserInfo
     * @desc Redux action to display the user info modal.
     */
    showUserInfo(state) {
      state.show = true;
    },
    /**
     * @public
     * @function hidUserInfo
     * @desc Redux action to hide the user info modal.
     */
    hideUserInfo(state) {
      state.show = false;
    },
  },
});

export const { showUserInfo, hideUserInfo } = UserInfoSlice.actions;

export default UserInfoSlice.reducer;

