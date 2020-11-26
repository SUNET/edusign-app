/**
 * @module slices/Documents
 * @desc Here we define the initial state for the documents key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The documents key of the state holds the documents added by the user to be signed.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
  processResponseData,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { dbSaveDocument, dbRemoveDocument } from "init-app/database";

/**
 * @public
 * @function prepareDocument
 * @desc Redux async thunk to send documents to the backend for preparation
 */
export const prepareDocument = createAsyncThunk(
  "documents/prepareDocument",
  async (document, thunkAPI) => {
    const body = preparePayload(thunkAPI.getState(), document);
    let data = null;
    try {
      const response = await fetch("/sign/add-doc", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({ level: "danger", message: "comm prob XXX TODO" })
      );
      return thunkAPI.rejectWithValue({
        ...document,
        state: "failed-preparing",
        reason: err.toString(),
      });
    }
    if ("message" in data) {
      const level = data.error ? "danger" : "success";
      thunkAPI.dispatch(
        addNotification({ level: level, message: data.message })
      );
    }
    if ("payload" in data) {
      const updatedDoc = {
        ...document,
        ...data.payload,
        state: "loaded",
      };
      return updatedDoc;
    }
    return thunkAPI.rejectWithValue({
      ...document,
      state: "failed-preparing",
      reason: data.message,
    });
  }
);

/**
 * @public
 * @function fetchSignedDocument
 * @desc Redux async thunk to get signed documents from the backend.
 */
export const fetchSignedDocument = createAsyncThunk(
  "documents/fetchSignedDocument",
  async (document, thunkAPI) => {
    const payload = {
      name: document.name,
      sign_response: document.sign_response,
      relay_state: document.relay_state,
    };
    const body = preparePayload(thunkAPI.getState(), payload);
    try {
      const response = fetch("/sign/get-signed", {
        ...postRequest,
        body: body,
      });
      const data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "comm prob signed XXX TODO",
        })
      );
      return thunkAPI.rejectWithValue({
        ...document,
        state: "failed-signing",
      });
    }
    if ("message" in data) {
      const level = data.error ? "danger" : "success";
      thunkAPI.dispatch(
        addNotification({ level: level, message: data.message })
      );
    }
    if ("payload" in data) {
      const updatedDoc = {
        ...document,
        ...data.payload,
        state: "loaded",
      };
      return updatedDoc;
    }
    return thunkAPI.rejectWithValue({
      ...document,
      state: "failed-signing",
      reason: data.message,
    });
  }
);

const documentsSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
  },
  reducers: {
    /**
     * @public
     * @function addDocument
     * @desc Redux action to add a document to the documents state key, setting its name, size and type,
     * and setting the the show key to false, the blob key to null and the state key to "loading".
     */
    addDocument(state, action) {
      const document = {
        // action.payload carries keys: name, size, type, and blob
        ...action.payload,
        show: false,
        state: "loading",
      };
      dbSaveDocument(document);
      state.documents.push(document);
    },
    /**
     * @public
     * @function updateDocument
     * @desc Redux action to update a document in the documents state key,
     * setting the blob key to the contents of the file as a base64 data URL, and the state key to "loaded".
     */
    updateDocument(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          const document = {
            ...action.payload,
            state: "loading",
          };
          dbSaveDocument(document);
          return document;
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    /**
     * @public
     * @function updateDocumentFail
     * @desc Redux action to mark that a document has failed loading, settngs its state to "failed-loading"
     */
    updateDocumentFail(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          const document = {
            ...doc,
            state: "failed-loading",
          };
          dbSaveDocument(document);
          return document;
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    /**
     * @public
     * @function showPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the show key to true (so that the UI will show a preview of the document).
     */
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
    /**
     * @public
     * @function hidePreview
     * @desc Redux action to update a document in the documents state key,
     * setting the show key to false (so that the UI will hide the preview of the document).
     */
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
    /**
     * @public
     * @function hidePreview
     * @desc Redux action to remove a document from the documents state key.
     */
    removeDocument(state, action) {
      dbRemoveDocument({name: action.payload});
      state.documents = state.documents.filter((doc) => {
        return doc.name !== action.payload;
      });
    },
    /**
     * @public
     * @function startSigningDocument
     * @desc Redux action to update a document in the documents state key,
     * setting the state key to "signing"
     */
    startSigningDocument(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (index === action.payload) {
          const document = {
            ...doc,
            state: "signing",
          };
          dbSaveDocument(document);
          return document;
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    /**
     * @public
     * @function setSigned
     * @desc Redux action to update a document in the documents state key,
     * setting the state key to "signed"
     */
    setSigned(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (doc.name === action.payload.name) {
          const document = {
            ...doc,
            ...action.payload,
            state: "signed",
          };
          dbSaveDocument(document);
          return document;
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    /**
     * @public
     * @function setStatus
     * @desc Redux action to update a document in the documents state key,
     * setting the state key to whatever we want, mainly for testing
     */
    setState(state, action) {
      state.documents = state.documents.map((doc, index) => {
        if (index === action.payload.index) {
          return {
            ...doc,
            state: action.payload.state,
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
  },
  extraReducers: {
    [prepareDocument.fulfilled]: (state, action) => {
      dbSaveDocument(action.payload);
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },

    [prepareDocument.rejected]: (state, action) => {
      dbSaveDocument(action.payload);
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },
    [fetchSignedDocument.fulfilled]: (state, action) => {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
          };
        } else {
          return {
            ...doc,
          };
        }
      });
    },

    [fetchSignedDocument.rejected]: (state, action) => {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
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

export const {
  addDocument,
  updateDocument,
  updateDocumentFail,
  showPreview,
  hidePreview,
  removeDocument,
  startSigningDocument,
} = documentsSlice.actions;

export default documentsSlice.reducer;
