/**
 * @module slices/FastSignature
 */
import { createSlice } from "@reduxjs/toolkit";

const FastSignatureSlice = createSlice({
  name: "fast_signature",
  initialState: {
    show: null,
  },
  reducers: {
    /**
     * @public
     * @function enableFastSignature
     * @desc Redux action to display the fast signature modal.
     */
    enableFastSignature(state, action) {
      state.show = action.payload;
    },
    /**
     * @public
     * @function disableFastSignature
     * @desc Redux action to not display the fast signature modal.
     */
    disableFastSignature(state) {
      state.show = null;
    },
  },
});

export const { enableFastSignature, disableFastSignature } = FastSignatureSlice.actions;

export default FastSignatureSlice.reducer;
