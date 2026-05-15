/**
 * @module slices/AL3Warning
 */
import { createSlice } from "@reduxjs/toolkit";

const AL3WarningSlice = createSlice({
  name: "al3_warning",
  initialState: {
    show: false,
  },
  reducers: {
    /**
     * @public
     * @function showAL3Warning
     * @desc Redux action to display the AL3 warning.
     */
    showAL3Warning(state) {
      state.show = true;
    },
    /**
     * @public
     * @function hideAL3Warning
     * @desc Redux action to hide the AL3 warning modal.
     */
    hideAL3Warning(state) {
      state.show = false;
    },
  },
});

export const { showAL3Warning, hideAL3Warning } = AL3WarningSlice.actions;

export default AL3WarningSlice.reducer;

