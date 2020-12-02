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
import { updateSigningForm } from "slices/Main";
import { dbSaveDocument, dbRemoveDocument } from "init-app/database";
import { getDb } from "init-app/database";

/**
 * @public
 * @function createDocument
 * @desc Redux async thunk to add a new document to IndexedDB.
 */
export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (document, thunkAPI) => {
    console.log("Creating document", document);
    document.show = false;
    document.state = "loading";
    const db = await getDb();
    if (db !== null) {
      const promisedDoc = new Promise((resolve, reject) => {
        const transaction = db.transaction(["documents"], "readwrite");
        transaction.onerror = (event) => {
          console.log("Problem with create transaction", event);
          reject("Problem with create transaction");
        };
        const docStore = transaction.objectStore("documents");
        console.log("saving document to db", document.name);
        const docRequest = docStore.add(document);
        docRequest.onsuccess = (event) => {
          console.log("saving document", event);
          resolve({
            ...document,
            id: event.target.result,
          });
        };
        docRequest.onerror = (event) => {
          console.log("Problem saving document", event);
          reject("Problem saving document");
        };
      });
      const newDoc = await promisedDoc;
      thunkAPI.dispatch(prepareDocument(newDoc));
      return newDoc;
    } else {
      console.log("Cannot save the state, db absent");
      thunkAPI.rejectWithValue(document);
    }
  }
);

/**
 * @public
 * @function loadDocuments
 * @desc Redux async thunk to get documents saved in IndexedDB.
 */
export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (arg, thunkAPI) => {
    console.log("loading persisted documents");
    const db = await getDb();
    console.log("loaded db", db);

    if (db !== null) {
      const promisedDocuments = new Promise((resolve, reject) => {
        const transaction = db.transaction(["documents"]);
        transaction.onerror = (event) => {
          console.log("cannot create a db transaction for reading", event);
          resolve([]);
        };
        const docStore = transaction.objectStore("documents");
        const docs = [];
        docStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            console.log("retrieving document from db", cursor.value);
            docs.push(cursor.value);
            cursor.continue();
          }
          if (cursor === null) {
            resolve(docs);
          }
        };
      });
      const documents = await promisedDocuments;
      return {
        documents: documents,
      };
    } else {
      console.log("could not open db");
      return {
        documents: [],
      };
    }
  }
);

/**
 * @public
 * @function prepareDocument
 * @desc Redux async thunk to send documents to the backend for preparation
 */
export const prepareDocument = createAsyncThunk(
  "documents/prepareDocument",
  async (document, thunkAPI) => {
    const docToSend = {
      name: document.name,
      blob: document.blob,
      size: document.size,
      type: document.type,
    };
    const body = preparePayload(thunkAPI.getState(), docToSend);
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
 * @function startSigningDocuments
 * @desc Redux async thunk to send documents to the backend for preparation
 */
export const startSigningDocuments = createAsyncThunk(
  "documents/startSigningDocuments",
  async (arg, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = [];
    let data = null;
    state.documents.documents.forEach((doc) => {
      if (doc.state === "selected") {
        docsToSign.push({
          name: doc.name,
          type: doc.type,
          ref: doc.ref,
          sign_requirement: doc.sign_requirement,
        });
        thunkAPI.dispatch(
          documentsSlice.actions.setState({ name: doc.name, state: "signing" })
        );
      }
    });
    const body = preparePayload(state, { documents: docsToSign });
    try {
      const response = await fetch("/sign/create-sign-request", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      console.log("Error creating sign request", err);
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "comm prob create XXX TODO",
        })
      );
      return thunkAPI.rejectWithValue({
        state: "failed-signing",
      });
    }
    data.payload.documents.forEach((doc) => {
      thunkAPI.dispatch(documentsSlice.actions.updateDocumentWithId(doc));
    });
    delete data.payload.documents;

    thunkAPI.dispatch(updateSigningForm(data.payload));
    const form = document.getElementById("signing-form");
    form.submit();
  }
);

/**
 * @public
 * @function fetchSignedDocuments
 * @desc Redux async thunk to get signed documents from the backend.
 */
export const fetchSignedDocuments = createAsyncThunk(
  "documents/fetchSignedDocuments",
  async (document, thunkAPI) => {
    const dataElem = document.getElementById("sign-response-holder");
    const payload = {
      sign_response: dataElem.dataset.signResponse,
      relay_state: dataElem.dataset.relayState,
    };
    const body = preparePayload(thunkAPI.getState(), payload);
    let data = null;
    try {
      const response = await fetch("/sign/get-signed", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      console.log("Error getting signed documents", err);
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
    try {
      data.payload.payload.documents.forEach((doc) => {
        thunkAPI.dispatch(
          documentsSlice.actions.updateDocumentWithSignedContent(doc)
        );
      });
    } catch (err) {
      console.log("Problem getting the signed documents", err);
      return thunkAPI.rejectWithValue({
        ...document,
        state: "failed-signing",
        reason: data.message,
      });
    }
  }
);

/**
 * @public
 * @function downloadSigned
 * @desc Redux async thunk to add a new document to IndexedDB.
 */
export const downloadSigned = createAsyncThunk(
  "documents/downloadSigned",
  async (document, thunkAPI) => {
    const state = thunkAPI.getState();
    state.documents.documents.forEach((doc) => {
      if (doc.name === document.name) {
        const a = document.createElement("a");
        a.setAttribute("href", "" + doc.signedContent);
        const newName =
          doc.name.split(".").slice(0, -1).join(".") + "-signed.pdf";
        a.setAttribute("download", newName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
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
     * @function showPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the show key to true (so that the UI will show a preview of the document).
     */
    showPreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
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
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
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
      dbRemoveDocument({ name: action.payload });
      state.documents = state.documents.filter((doc) => {
        return doc.name !== action.payload;
      });
    },
    /**
     * @public
     * @function toggleDocSelection
     * @desc Redux action to toggle a document's state between loaded and selected.
     */
    toggleDocSelection(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          const state = action.payload.select ? "selected" : "loaded";
          const document = {
            ...doc,
            state: state,
          };
          dbSaveDocument(document);
          return document;
        } else return doc;
      });
    },
    /**
     * @public
     * @function startSigningDocument
     * @desc Redux action to update a document in the documents state key,
     * setting the state key to "signing"
     */
    startSigningDocument(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
          const document = {
            ...doc,
            state: "signing",
          };
          dbSaveDocument(document);
          return document;
        } else return doc;
      });
    },
    /**
     * @public
     * @function updateDocumentWithId
     * @desc Redux action to update a document with the id sent to the siign API
     */
    updateDocumentWithId(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...doc,
            id: action.payload.id,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function updateDocumentWithSignedContent
     * @desc Redux action to update a document with the signed content
     */
    updateDocumentWithSignedContent(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.id === action.payload.id) {
          return {
            ...doc,
            signedContent: action.payload.signedContent,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setSigned
     * @desc Redux action to update a document in the documents state key,
     * setting the state key to "signed"
     */
    setSigned(state, action) {
      state.documents = state.documents.map((doc) => {
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
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
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
    [createDocument.fulfilled]: (state, action) => {
      state.documents.push(action.payload);
    },
    [loadDocuments.fulfilled]: (state, action) => {
      state.documents = action.payload.documents;
    },
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
    [fetchSignedDocuments.fulfilled]: (state, action) => {
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

    [fetchSignedDocuments.rejected]: (state, action) => {
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
  showPreview,
  hidePreview,
  removeDocument,
  startSigningDocument,
  toggleDocSelection,
} = documentsSlice.actions;

export default documentsSlice.reducer;
