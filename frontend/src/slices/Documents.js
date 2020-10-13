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
    showPreview(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (index === action.payload) {
          return {
            ...doc,
            show: true
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    hidePreview(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (index === action.payload) {
          return {
            ...doc,
            show: false
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
  },
});

export const { addDocuments,
               addDocument,
               showPreview,
               hidePreview } = documentsSlice.actions;

export default documentsSlice.reducer;

