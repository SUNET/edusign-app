/**
 * @module slices/Documents
 * @desc Here we define the initial state for the documents key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The documents key of the state holds the documents added by the user to be signed,
 * in whatever stage of the signing procedure they may be.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as pdfjs from 'pdfjs-dist';

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { updateSigningForm } from "slices/Main";
import { dbSaveDocument, dbRemoveDocument } from "init-app/database";
import { getDb } from "init-app/database";

/**
 * @public
 * @function loadDocuments
 * @desc Redux async thunk to load documents saved in IndexedDB.
 */
export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (arg, thunkAPI) => {
    console.log("loading persisted documents");
    const db = await getDb();
    console.log("loaded db", db);

    if (db !== null) {
      let signing = false;
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
            const document = cursor.value;
            console.log("retrieving document from db", document);
            docs.push(document);
            if (document.state === "signing") {
              signing = true;
            }
            cursor.continue();
          }
          if (cursor === null) {
            resolve(docs);
          }
        };
      });
      let documents = await promisedDocuments;
      if (signing) {
        const dataElem = document.getElementById("sign-response-holder");
        if (dataElem !== null) {
          fetchSignedDocuments(thunkAPI, dataElem);
        } else {
          documents = documents.map((doc) => {
            if (doc.state === "signing") {
              return {
                ...doc,
                state: "failed-signing",
                message: "XXX Thre was a problem signing the document",
              };
            } else return doc;
          });
        }
      }
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


async function validateDoc(doc) {
  return await pdfjs.getDocument({url: doc.blob, password: ""}).promise
    .then((validated) => {
      console.log("Validated document", validated);
      doc.show = false;
      doc.state = "loading";
      return doc;
    })
    .catch((err) => {
      console.log("Error validating doc", err);
      if (err.name === 'PasswordException') {
        doc.message = "XXX Please do not supply a password protected document";
      } else if (err.message.startsWith('Invalid')) {
        doc.message = "XXX Document seems corrupted";
      } else {
        doc.message = "XXX Document is unreadable";
      }
      doc.state = "failed-loading";
      return doc;
    });
}


/**
 * @public
 * @function createDocument
 * @desc Redux async thunk to add a new document to IndexedDB
 * and to the store.
 */
export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (document, thunkAPI) => {
    console.log("Validating document", document.name);
    document = await validateDoc(document);
    if (document.state === 'failed-loading') return document;
    console.log("Creating document", document);
    const db = await getDb();
    console.log("Got db", db);
    if (db !== null) {
      try {
        const newDoc = await new Promise((resolve, reject) => {
          console.log("Waiting to save document being created");
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
          docRequest.onerror = () => {
            reject("Problem saving document");
          };
        });
        console.log("About to prepare document", newDoc);
        thunkAPI.dispatch(prepareDocument(newDoc));
        return newDoc;
      } catch (err) {
        console.log("Problem saving document to db", err);
        thunkAPI.dispatch(
          addNotification({
            level: "danger",
            message:
              "XXX Problem saving document(s) in session, will not persist",
          })
        );
        document.state = "loaded";
        thunkAPI.rejectWithValue(document);
      }
    } else {
      console.log("Cannot save the doc, db absent");
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message:
            "XXX Problem saving document(s) in session, will not persist",
        })
      );
      document.state = "loaded";
      thunkAPI.rejectWithValue(document);
    }
  }
);

/**
 * @public
 * @function prepareDocument
 * @desc Redux async thunk to send documents to the backend for preparation
 * and to update the state of the documents in the redux store.
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
    console.log("preparing document", docToSend);
    const body = preparePayload(thunkAPI.getState(), docToSend);
    let data = null;
    try {
      console.log("Using fetch to post to add-doc", body);
      const response = await fetch("/sign/add-doc", {
        ...postRequest,
        body: body,
      });
      console.log("Used fetch to post to add-doc");
      data = await checkStatus(response);
      console.log("And got data", data);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      console.log("Problem preparing document", err);
      return {
        ...document,
        state: "failed-preparing",
        message: "XXX Problem preparing document, please try again",
      };
    }
    if ("payload" in data) {
      const updatedDoc = {
        ...document,
        ...data.payload,
        state: "loaded",
      };
      return updatedDoc;
    }
    let msg = "XXX XXX Problem preparing document, please try again";
    if ("message" in data) {
      msg = data.message;
    }
    return {
      ...document,
      state: "failed-preparing",
      message: msg,
    };
  }
);

/**
 * @public
 * @function startSigningDocuments
 * @desc Redux async thunk to tell the backend to create a sign request
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
          documentsSlice.actions.startSigningDocument(doc.name)
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
      console.log("Data received from the create-sign-request endpoint", data);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        if (data.message === "expired cache") {
          thunkAPI.dispatch(
            addNotification({
              level: "success",
              message: "XXX Please wait ...",
            })
          );
          thunkAPI.dispatch(restartSigningDocuments());
          return;
        }

        throw new Error(data.message);
      }
      data.payload.documents.forEach((doc) => {
        thunkAPI.dispatch(documentsSlice.actions.updateDocumentWithId(doc));
      });
      delete data.payload.documents;

      thunkAPI.dispatch(updateSigningForm(data.payload));
      const form = document.getElementById("signing-form");
      form.requestSubmit();
    } catch (err) {
      console.log("Error creating sign request", err);
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "XXX Problem creating signature request",
        })
      );
      thunkAPI.dispatch(documentsSlice.actions.signFailure());
    }
  }
);

/**
 * @public
 * @function restartSigningDocuments
 * @desc Redux async thunk to tell the backend to prepare the documents and create a sign request
 */
export const restartSigningDocuments = createAsyncThunk(
  "documents/restartSigningDocuments",
  async (arg, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = [];
    let data = null;
    state.documents.documents.forEach((doc) => {
      if (doc.state === "signing") {
        docsToSign.push({
          name: doc.name,
          blob: doc.blob,
          type: doc.type,
          size: doc.size,
        });
      }
    });
    const body = preparePayload(state, { documents: docsToSign });
    try {
      const response = await fetch("/sign/recreate-sign-request", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      data.payload.documents.forEach((doc) => {
        thunkAPI.dispatch(documentsSlice.actions.updateDocumentWithId(doc));
      });
      delete data.payload.documents;

      thunkAPI.dispatch(updateSigningForm(data.payload));
      const form = document.getElementById("signing-form");
      form.requestSubmit();
    } catch (err) {
      console.log("Error creating sign request", err);
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "XXX Problem creating signature request",
        })
      );
      thunkAPI.dispatch(documentsSlice.actions.signFailure());
    }
  }
);

/**
 * @public
 * @function fetchSignedDocuments
 * @desc async funtion to get signed documents from the backend.
 */
const fetchSignedDocuments = async (thunkAPI, dataElem) => {
  const payload = {
    sign_response: dataElem.dataset.signresponse,
    relay_state: dataElem.dataset.relaystate,
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
    if (data.error) {
      throw new Error(data.message);
    }
    if ("message" in data) {
      const level = data.error ? "danger" : "success";
      thunkAPI.dispatch(
        addNotification({ level: level, message: data.message })
      );
    }
    data.payload.documents.forEach((doc) => {
      thunkAPI.dispatch(
        documentsSlice.actions.updateDocumentWithSignedContent(doc)
      );
    });
  } catch (err) {
    console.log("Error getting signed documents", err);
    thunkAPI.dispatch(
      addNotification({
        level: "danger",
        message: "XXX Problem getting signed documents",
      })
    );
    thunkAPI.dispatch(documentsSlice.actions.signFailure());
  }
};

/**
 * @public
 * @function downloadSigned
 * @desc Redux async thunk to hand signed documents to the user.
 */
export const downloadSigned = createAsyncThunk(
  "documents/downloadSigned",
  async (docname, thunkAPI) => {
    const state = thunkAPI.getState();
    state.documents.documents.forEach((doc) => {
      if (doc.name === docname) {
        const a = document.createElement("a");
        a.setAttribute("href", doc.signedContent);
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
        } else return doc;
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
        } else return doc;
      });
    },
    /**
     * @public
     * @function removeDocument
     * @desc Redux action to remove a document from the store
     */
    removeDocument(state, action) {
      state.documents.forEach((doc) => {
        if (doc.name === action.payload) {
          if (doc.id !== undefined) {
            dbRemoveDocument(doc);
          }
        }
      });
      state.documents = state.documents.filter((doc) => {
        return doc.name !== action.payload;
      });
    },
    /**
     * @public
     * @function removeAllDocuments
     * @desc Redux action to remove all documents from the store
     */
    removeAllDocuments(state) {
      state.documents = new Array();
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
     * @desc Redux action to update a document in the store
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
     * @desc Redux action to update a document with the id sent to the sign API
     */
    updateDocumentWithId(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          const document = {
            ...doc,
            signing_id: action.payload.id,
          };
          dbSaveDocument(document);
          return document;
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
        if (doc.signing_id === action.payload.id) {
          const document = {
            ...doc,
            signedContent:
              "data:application/pdf;base64," + action.payload.signed_content,
            state: "signed",
          };
          dbSaveDocument(document);
          return document;
        } else return doc;
      });
    },
    /**
     * @public
     * @function signFailure
     * @desc Redux action to update documents in signing state
     * when the request to sign them has failed
     */
    signFailure(state) {
      state.documents = state.documents.map((doc) => {
        console.log("Sign failure for !!", doc.state);
        if (doc.state === "signing") {
          const document = {
            ...doc,
            state: "failed-signing",
            message: "XXX Problem signing the document",
          };
          dbSaveDocument(document);
          return document;
        } else return doc;
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
            ...action.payload,
          };
        } else return doc;
      });
    },
  },
  extraReducers: {
    [createDocument.fulfilled]: (state, action) => {
      state.documents.push(action.payload);
    },
    [createDocument.rejected]: (state, action) => {
      console.log("Documents after rejection", action);
      state.documents.push(action.payload);
      console.log("Documents after rejection", state.documents);
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
        } else return doc;
      });
    },

    [prepareDocument.rejected]: (state, action) => {
      dbSaveDocument(action.payload);
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload.name) {
          return {
            ...action.payload,
          };
        } else return doc;
      });
    },
  },
});

export const {
  showPreview,
  hidePreview,
  removeDocument,
  removeAllDocuments,
  setState,
  toggleDocSelection,
} = documentsSlice.actions;

export default documentsSlice.reducer;
