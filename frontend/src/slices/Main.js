import { createSlice } from "@reduxjs/toolkit";

const mainSlice = createSlice({
  name: "main",
  initialState: {
    loading: false,
  },
  reducers: {
    appLoaded(state, action) {
      state.loading = false;
    },
  },
});

export const { appLoaded } = mainSlice.actions;

export default mainSlice.reducer;
