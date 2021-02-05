/**
 * @module slices/DnDArea
 * @desc Here we define the initial state for the dnd key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The dnd key of the state holds the information needed to render the DnD area of the app.
 * There are 3 possible states for the DnD area: "waiting", that corresponds to the absence of any DnD event,
 * "loading", that is set when some document(s) are being dropped in the area,
 * and "receiving", that is triggered by a dragEnter event, and discarded by dragLeave or dropFile events.
 */
import { createSlice } from "@reduxjs/toolkit";

const dndSlice = createSlice({
  name: "dnd",
  initialState: {
    state: "waiting", // waiting | receiving
  },
  reducers: {
    /**
     * @public
     * @function setReceiving
     * @desc Redux action to set the dnd state to "receiving"
     */
    setReceiving(state) {
      state.state = "receiving";
    },
    /**
     * @public
     * @function setLoading
     * @desc Redux action to set the dnd state to "loading"
     */
    setLoading(state) {
      state.state = "loading";
    },
    /**
     * @public
     * @function setWaiting
     * @desc Redux action to set the dnd state to "waiting"
     */
    setWaiting(state) {
      state.state = "waiting";
    },
  },
});

export const { setWaiting, setLoading, setReceiving } = dndSlice.actions;

export default dndSlice.reducer;
