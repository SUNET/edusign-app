import { createSlice } from "@reduxjs/toolkit";

const documentsSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
  },
  reducers: {
    addDocuments(state, action) {
      state.documents = action.payload;
    },
    addDocument(state, action) {
      state.documents.push(action.payload);
    },
  },
});

export const { addDocuments, addDocument } = documentsSlice.actions;

export default documentsSlice.reducer;

