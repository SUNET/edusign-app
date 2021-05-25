/**
 * @module slices/Documents
 * @desc Here we define the initial state for the documents key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The documents key of the state holds the documents added by the user to be signed,
 * in whatever stage of the signing procedure they may be.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as pdfjs from "pdfjs-dist";

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { updateSigningForm, addOwned, removeOwned } from "slices/Main";
import { dbSaveDocument, dbRemoveDocument } from "init-app/database";
import { getDb } from "init-app/database";

/**
 * @public
 * @function loadDocuments
 * @desc Redux async thunk to load documents saved in IndexedDB.
 */
export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (args, thunkAPI) => {
    const db = await getDb();

    if (db !== null) {
      let signing = false;
      const promisedDocuments = new Promise((resolve, reject) => {
        const transaction = db.transaction(["documents"]);
        transaction.onerror = (event) => {
          resolve([]);
        };
        const docStore = transaction.objectStore("documents");
        const docs = [];
        docStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const document = cursor.value;
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
          fetchSignedDocuments(thunkAPI, dataElem, args.intl);
        } else {
          documents = documents.map((doc) => {
            if (doc.state === "signing") {
              return {
                ...doc,
                state: "failed-signing",
                message: args.intl.formatMessage({defaultMessage: "There was a problem signing the document", id: "load-doc-problem-signing"}),
              };
            } else return doc;
          });
        }
      }
      return {
        documents: documents,
      };
    } else {
      return {
        documents: [],
      };
    }
  }
);

/**
 * @public
 * @function validateDoc
 * @desc Redux async action to validate PDF documents
 */
async function validateDoc(doc, intl) {
  return await pdfjs
    .getDocument({ url: doc.blob, password: "" })
    .promise.then((validated) => {
      doc.show = false;
      doc.state = "loading";
      return doc;
    })
    .catch((err) => {
      if (err.name === "PasswordException") {
        doc.message = args.intl.formatMessage({defaultMessage: "Please do not supply a password protected document", id: "validate-problem-password"});
      } else if (err.message.startsWith("Invalid")) {
        doc.message = args.intl.formatMessage({defaultMessage: "Document seems corrupted", id: "validate-problem-corrupted"});
      } else {
        doc.message = args.intl.formatMessage({defaultMessage: "Document is unreadable", id: "validate-problem-unreadable"});
      }
      doc.state = "failed-loading";
      return doc;
    });
}

/**
 * @public
 * @function saveDocumentToDb
 * @desc Redux async thunk to add a new document to IndexedDB
 */
const saveDocumentToDb = async (document) => {
  const db = await getDb();
  if (db !== null) {
    const newDoc = await new Promise((resolve, reject) => {
      const transaction = db.transaction(["documents"], "readwrite");
      transaction.onerror = (event) => {
        reject("Problem with create transaction");
      };
      const docStore = transaction.objectStore("documents");
      const docRequest = docStore.add(document);
      docRequest.onsuccess = (event) => {
        resolve({
          ...document,
          id: event.target.result,
        });
      };
      docRequest.onerror = () => {
        reject("Problem saving document");
      };
    });
    return newDoc;
  } else {
    throw new Error("DB absent, cannot save document");
  }
};

/**
 * @public
 * @function createDocument
 * @desc Redux async thunk to add a new document to IndexedDB
 * and to the store.
 */
export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (args, thunkAPI) => {
    document = await validateDoc(args.doc, args.intl);
    if (document.state === "failed-loading") return document;

    try {
      const newDoc = await saveDocumentToDb(document);
      thunkAPI.dispatch(prepareDocument(newDoc));
      return newDoc;
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "",
          message: args.intl.formatMessage({defaultMessage: "Problem saving document(s) in session, will not persist", id: "save-doc-problem-session"}),
        })
      );
      document.state = "loaded";
      return thunkAPI.rejectWithValue(document);
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
  async (args, thunkAPI) => {
    const document = args.doc;
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
      return {
        ...document,
        state: "failed-preparing",
        message: args.intl.formatMessage({defaultMessage: "Problem preparing document, please try again", id: "prepare-doc-problem"}),
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
    let msg = args.intl.formatMessage({defaultMessage: "Problem preparing document, please try again", id: "prepare-doc-problem"});
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
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = [];
    let data = null;
    state.documents.documents.forEach((doc) => {
      if (doc.state === "selected") {
        docsToSign.push({
          name: doc.name,
          type: doc.type,
          ref: doc.ref,
          key: doc.key,
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
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        if (data.message === "expired cache") {
          thunkAPI.dispatch(
            addNotification({
              level: "success",
              message: args.intl.formatMessage({defaultMessage: "Please wait...", id: "start-signing-please-wait"}),
            })
          );
          thunkAPI.dispatch(restartSigningDocuments({intl: args.intl}));
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
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({defaultMessage: "Problem creating signature request", id: "problem-creating-sign-request"}),
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
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = [];
    let data = null;
    state.documents.documents.forEach((doc) => {
      if (doc.state === "signing") {
        docsToSign.push({
          name: doc.name,
          key: doc.key,
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
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({defaultMessage: "Problem creating signature request", id: "problem-creating-sign-request"}),
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
const fetchSignedDocuments = async (thunkAPI, dataElem, intl) => {
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
      thunkAPI.dispatch(removeInvites(doc));
    });
  } catch (err) {
    thunkAPI.dispatch(
      addNotification({
        level: "danger",
        message: args.intl.formatMessage({defaultMessage: "Problem getting signed documents", id: "problem-getting-signed"}),
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

/**
 * @public
 * @function sendInvites
 * @desc Redux async thunk to create multi sign requests
 */
export const sendInvites = createAsyncThunk(
  "main/sendInvites",
  async (args, thunkAPI) => {
    const documentId = args.values.documentId;
    const invitees = args.values.invitees;

    const state = thunkAPI.getState();

    const document = state.documents.documents.filter((doc) => {
      return doc.id === documentId;
    })[0];

    const owner = state.main.signer_attributes.filter((attr) => {
      return attr.name === "mail";
    })[0].value;

    const dataToSend = {
      owner: owner,
      invites: invitees,
      text: args.values.invitationText,
      document: {
        key: document.key,
        name: document.name,
        blob: document.blob.split(",")[1],
        size: document.size,
        type: document.type,
      },
    };
    const body = preparePayload(thunkAPI.getState(), dataToSend);
    let data = null;
    try {
      const response = await fetch("/sign/create-multi-sign", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      const message = args.intl.formatMessage({defaultMessage: "Problem sending multi sign request, please try again", id: "problem-sending-multisign"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    if (data.error) {
      const message = args.intl.formatMessage({defaultMessage: "Problem creating multi sign request, please try again", id: "problem-creating-multisign"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    const owned = {
      key: document.key,
      name: document.name,
      size: document.size,
      type: document.type,
      pending: invitees,
      signed: [],
    };
    thunkAPI.dispatch(addOwned(owned));
    return document.key;
  }
);

/**
 * @public
 * @function removeInvites
 * @desc Redux async thunk to remove multi sign requests
 */
export const removeInvites = createAsyncThunk(
  "main/removeInvites",
  async (args, thunkAPI) => {

    const state = thunkAPI.getState();

    const documentList = state.main.owned_multisign.filter((doc) => {
      return args.doc.key === doc.key || args.doc.id === doc.key;
    });

    if (documentList.length === 0) {
      return;
    }

    const document = documentList[0];

    const dataToSend = {
      key: document.key,
    };
    const body = preparePayload(state, dataToSend);
    let data = null;
    try {
      const response = await fetch("/sign/remove-multi-sign", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      const message = args.intl.formatMessage({defaultMessage: "Problem removing multi sign request, please try again", id: "problem-removing-multisign"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    if (data.error) {
      const message = args.intl.formatMessage({defaultMessage: "Problem removing multi sign request, please try again", id: "problem-removing-multisign"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    const owned = {
      key: document.key,
    };
    thunkAPI.dispatch(removeOwned(owned));
    const message = args.intl.formatMessage({defaultMessage: "Success removing multi sign request", id: "success-removing-multisign"});
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  }
);

/**
 * @public
 * @function resendInvitations
 * @desc Redux async thunk to resend invitations to sign to pending users
 */
export const resendInvitations = createAsyncThunk(
  "main/resendInvitations",
  async (args, thunkAPI) => {

    const docId = args.values.documentId;
    const text = args.values['re-invitationText'];

    const state = thunkAPI.getState();

    const documentList = state.main.owned_multisign.filter((doc) => {
      return docId === doc.key;
    });

    if (documentList.length === 0) {
      return;
    }

    const document = documentList[0];

    const dataToSend = {
      key: document.key,
      text: text,
    };
    const body = preparePayload(state, dataToSend);
    let data = null;
    try {
      const response = await fetch("/sign/send-multisign-reminder", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      const message = args.intl.formatMessage({defaultMessage: "Problem sending invitations to sign, please try again", id: "problem-sending-invitations"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    if (data.error) {
      const message = args.intl.formatMessage({defaultMessage: "Problem sending invitations to sign, please try again", id: "problem-sending-invitations"});
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    const message = args.intl.formatMessage({defaultMessage: "Success resending invitations to sign", id: "success-sending-invitations"});
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  }
);

/**
 * @public
 * @function signInvitedDoc
 * @desc Redux async thunk to finally sign a multi signed document
 */
export const signInvitedDoc = createAsyncThunk(
  "main/signInvitedDoc",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    let data = null;
    const docToSign = {
      key: args.doc.key,
    };
    const body = preparePayload(state, docToSign);
    try {
      const response = await fetch("/sign/final-sign-request", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      const doc = {
        ...data.payload.documents[0],
        state: "signing",
        show: false,
      };
      doc.blob = "data:application/pdf;base64," + doc.blob;
      saveDocumentToDb(doc);
      delete data.payload.documents;

      thunkAPI.dispatch(updateSigningForm(data.payload));
      const form = document.getElementById("signing-form");
      form.requestSubmit();
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({defaultMessage: "Problem creating signature request", id: "problem-creating-sign-request"}),
        })
      );
      thunkAPI.dispatch(documentsSlice.actions.signFailure());
    }
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
            signing_id: action.payload.key,
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
        if (
          doc.signing_id === action.payload.id ||
          doc.key === action.payload.id
        ) {
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

    [sendInvites.fulfilled]: (state, action) => {
      state.documents.forEach((doc) => {
        if (doc.key === action.payload) {
          dbRemoveDocument(doc);
        }
      });
      state.documents = state.documents.filter((doc) => {
        return doc.key !== action.payload;
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
