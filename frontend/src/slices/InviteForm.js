/**
 * @module slices/InviteForm
 * @desc Here we keep some state related to the invite form, in the invite key of the tredux store,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const inviteFormSlice = createSlice({
  name: "inviteform",
  initialState: {
    show_loa_selection: false,
    send_signed: true,
  },
  reducers: {
    /**
     * @public
     * @function toggleLoa
     * @desc Redux action to show the widget to select required loa
     */
    toggleLoa(state) {
      state.show_loa_selection = !state.show_loa_selection;
    },
    /**
     * @public
     * @function showLoa
     * @desc Redux action to show the widget to select required loa
     */
    showLoa(state) {
      state.show_loa_selection = true;
    },
    /**
     * @public
     * @function hideLoa
     * @desc Redux action to hide the widget to select required loa
     */
    hideLoa(state) {
      state.show_loa_selection = false;
    },
    /**
     * @public
     * @function toggleSendSigned
     * @desc Redux action to toggle the send_signed flag, used to decide whether to
     * show the controls to invite people only as recipients of the signed document.
     */
    toggleSendSigned(state) {
      state.send_signed = !state.send_signed;
    },
    /**
     * @public
     * @function showSendSigned
     * @desc Redux action to turn on the send_signed flag, used to decide whether to
     * show the controls to invite people only as recipients of the signed document.
     */
    showSendSigned(state) {
      state.send_signed = true;
    },
    /**
     * @public
     * @function hideSendSigned
     * @desc Redux action to turn off the send_signed flag, used to decide whether to
     * show the controls to invite people only as recipients of the signed document.
     */
    hideSendSigned(state) {
      state.send_signed = false;
    },
  },
});

export const { toggleLoa, showLoa, hideLoa, toggleSendSigned, showSendSigned, hideSendSigned } = inviteFormSlice.actions;

export default inviteFormSlice.reducer;
