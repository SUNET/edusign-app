import { createSlice } from "@reduxjs/toolkit";

const documentsSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
  },
  reducers: {
    addDocument(state, action) {
      state.documents.push({
        // action.payload carries keys: name, size, type, and blob
        ...action.payload,
        show: false,
        state: "loading",
      });
    },
    updateDocument(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
            state: "loaded",
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    showPreview(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (index === action.payload) {
          return {
            ...doc,
            show: true,
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
            show: false,
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    removeDocument(state, action) {
      state.documents = state.documents.filter((doc, index) => {
        return index !== action.payload;
      });
    },
  },
});

export const {
  addDocument,
  updateDocument,
  showPreview,
  hidePreview,
  removeDocument,
} = documentsSlice.actions;

export default documentsSlice.reducer;
