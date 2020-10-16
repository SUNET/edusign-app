import { createSlice } from "@reduxjs/toolkit";

const dndSlice = createSlice({
  name: "dnd",
  initialState: {
    state: "waiting", // waiting | receiving
  },
  reducers: {
    setReceiving(state, action) {
      state.state = "receiving";
    },
    setWaiting(state, action) {
      state.state = "waiting";
    },
  },
});

export const { setWaiting, setReceiving } = dndSlice.actions;

export default dndSlice.reducer;
