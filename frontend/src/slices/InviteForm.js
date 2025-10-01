/**
 * @module slices/InviteForm
 * @desc Here we keep some state related to the invite form, in the invite key of the tredux store,
 * and the actions and reducers to manipulate it.
 */
import { createSlice } from "@reduxjs/toolkit";

const inviteFormSlice = createSlice({
  name: "inviteform",
  initialState: {
    inviting: false,
    ordered: null,
    allowbankid: null,
  },
  reducers: {
    /**
     * @public
     * @function isInviting
     * @desc Redux action to indicate that the invite form is submitting
     */
    isInviting(state) {
      state.inviting = true;
    },
    /**
     * @public
     * @function isNotInviting
     * @desc Redux action to indicate that the invite form is not submitting
     */
    isNotInviting(state) {
      state.inviting = false;
    },
    /**
     * @public
     * @function setOrdered
     * @desc Redux action to indicate that the invitations are ordered
     */
    setOrdered(state, action) {
      state.ordered = action.payload;
    },
    /**
     * @public
     * @function setAllowBankID
     * @desc Redux action to indicate that the invitations can be signed with BankID
     */
    setAllowBankID(state, action) {
      state.allowbankid = action.payload;
    },
  },
});

export const { isInviting, isNotInviting, setOrdered, setAllowBankID } =
  inviteFormSlice.actions;

export default inviteFormSlice.reducer;
