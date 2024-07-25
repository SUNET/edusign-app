/**
 * @module slices/Documents
 * @desc Here we define the initial state for the documents key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The documents key of the redux state holds the documents added by the user to be signed,
 * in whatever stage of the signing procedure they may be.
 *
 * Loaded documents are persisted in an IndexedDB database. These docs can be already signed,
 * or waiting to be signed.
 *
 * When other users are invited to sign a document, this document is removed from IndexedDB,
 * and sent to the backend, where they are persisted in a database (redis or sqlite).
 *
 * When then app is loaded, it retrieves the persisted documents, both from the local
 * indexedDB and from the database in the backend, to display them in the UI.
 *
 * The functions in this module deal mainly with sending requests to the backend,
 * related to both the signing processes and the invitation processes.
 *
 * The main complication in all this comes from the possibility of sending different
 * documents to be signed all together; i.e., documents kept locally in the browser's
 * IndexedDB, and documents kept in the backend database, both as invitations from the
 * user and to the user.
 *
 * The use of the browser's localStorage to keep track of invitations being signed
 * deverves a special note. If there is some problem retrieving documents from the
 * backend database, that are referenced in a signature request, they will simply
 * not be included in the set of signed documents; so the frontend app needs to keep
 * track of those, and check that they are included (or not) in the obtained set of
 * signed documents. The frontside app does this by keeping a reference to all
 * invitations sent for signing in local storage. Then, when the user has been through
 * the sign service and IdP to sign the documents, and the frontside js app is loaded
 * again, it checks the data kept in local storage to update the state accordingly.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { pdfjs } from "react-pdf";
import * as FileSaver from "file-saver";
import JSZip from "jszip";

export { FileSaver };

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
  esFetch,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import {
  updateSigningForm,
  removeOwned,
  finishInvited,
  startSigningInvited,
  startSigningOwned,
  setOwnedState,
  setInvitedState,
  updateInvitations,
  invitationsSignFailure,
  updateInvitationsFailed,
} from "slices/Main";
import { setTemplates, addTemplate } from "slices/Templates";
import { dbSaveDocument, dbRemoveDocument, getDb } from "init-app/database";
import {
  b64toBlob,
  hashCode,
  humanFileSize,
  nameForDownload,
} from "components/utils";

/**
 * @public
 * @function loadDocuments
 * @desc Redux async thunk to load documents saved in IndexedDB.
 * This is called after the JS app is loaded and rendered, to allow the user
 * to continue working with the documents they had loaded in previous sessions.
 *
 * There are 2 different occasions when the app is loaded and documents are retrieved from IDB:
 *
 * + When the user first loads the app to start working with it;
 * + When the users finishes signing some document(s), after taking the user agent through the
 *   sign service and the IdP, and finally getting back at the JS app.
 */
export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (args, thunkAPI) => {
    const db = await getDb(args.eppn);
    const state = thunkAPI.getState();

    if (db !== null) {
      let signing = false;
      // here we load the documents form the IndexedDB db
      const promisedDocuments = new Promise((resolve, reject) => {
        const transaction = db.transaction(["documents"]);
        transaction.onerror = (event) => {
          resolve([]);
        };
        const docStore = transaction.objectStore("documents");
        const docs = [];
        const temps = [];
        docStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const doc = cursor.value;
            if (doc.state === "signing") {
              signing = true;
            }
            if (doc.isTemplate) {
              temps.push(doc);
            } else {
              docs.push(doc);
            }
            cursor.continue();
          }
          if (cursor === null) {
            resolve({ templates: temps, documents: docs });
          }
        };
      });
      let { documents, templates } = await promisedDocuments;
      let dataElem = null;
      // If we are getting back to the app after a signing procedure,
      // here we get information from local storage in the browser
      // about the (invitation) documents that were sent to be signed. (see the
      // `restartSigningDocuments` thunk, where this information is set).
      //
      const storageName =
        "signing-" + hashCode(state.main.signer_attributes.eppn);
      const stored = JSON.parse(localStorage.getItem(storageName));
      if (stored !== null) {
        [stored.invited, stored.owned].forEach((docs) => {
          docs.forEach((doc) => {
            if (doc.state === "signing") {
              signing = true;
            }
          });
        });
        thunkAPI.dispatch(updateInvitations(stored));
      }
      if (signing) {
        // If we are loading the app to start working rather than after a signing procedure
        // (so there is no element with id `sign-response-holder`, which would be injected in the html
        // in the response from the backend callback provided to the sign service),
        // and there are documents with state "signing", mark them as failed.
        dataElem = document.getElementById("sign-response-holder");
        if (dataElem === null) {
          documents = await Promise.all(
            documents.map(async (doc) => {
              if (doc.state === "signing") {
                const failedDoc = {
                  ...doc,
                  state: "failed-signing",
                  message: args.intl.formatMessage({
                    defaultMessage: "There was a problem signing the document",
                    id: "problem-signing-doc",
                  }),
                };
                await dbSaveDocument(failedDoc);
                return failedDoc;
              } else return doc;
            }),
          );
          thunkAPI.dispatch(
            updateInvitationsFailed({
              message: args.intl.formatMessage({
                defaultMessage:
                  "There was a problem signing the document",
                id: "prepare-doc-problem",
              }),
            }),
          );
        }
      }
      // If we are loading the app after signing some documents, and there are
      // documents with state "loading", mark them as failed.
      documents = await Promise.all(
        documents.map(async (doc) => {
          if (doc.state === "loading") {
            const failedDoc = {
              ...doc,
              state: "failed-preparing",
              message: args.intl.formatMessage({
                defaultMessage:
                  "There was a problem preparing the document",
                id: "load-doc-problem-preparing",
              }),
            };
            await dbSaveDocument(failedDoc);
            return failedDoc;
          } else return doc;
        }),
      );
      // Add the documents obtained from the local IndexedDB to the Redux state,
      // and if we are loading the app after a signing procedure,
      // trigger a call to the backend to retrieve the signed docs from the backend.
      thunkAPI.dispatch(documentsSlice.actions.setDocuments(documents));
      thunkAPI.dispatch(setTemplates(templates));
      if (signing && dataElem !== null) {
        await fetchSignedDocuments(thunkAPI, dataElem, args.intl);
      } else {
        // If we are loading the app without having signed anything yet,
        // remove any information that might have been left in local storage.
        localStorage.removeItem(storageName);
      }
    } else {
      return {
        documents: [],
      };
    }
  },
);

/**
 * @public
 * @function checkStoredDocuments
 * @desc Redux async thunk to load documents saved in localStorage, after going
 * through the process of signing. The main objective here is to update the info
 * on the documents that failed to be properly prepared for signing.
 *
 * Data on invited documents is kept locally in the browser in the redux store,
 * but during the signing process, this data is discarded to be loaded again afterwards.
 * The data for the locally (in IndexedDB) stored documents is persistent and can
 * be loaded afterwards with no problem. But the data about invitations that have
 * failed to be prepared for signing belongs to documents that are not persisted in the
 * browser, and at the same time, it is very transient data, to be consumed immediately
 * after returning from the signing procedure. So both sending it to the backend to
 * retrieve it later, and providing a specific IndexedDB table to keep it in the browser,
 * seem overkill. The solution is just keeping it in local storage.
 *
 * So this retrieves the documents from the local storage, and checks whether any of
 * them are failed, and update their representation in the redux store with that info,
 * and then deletes the data from localStorage.
 */
export const checkStoredDocuments = createAsyncThunk(
  "documents/checkStoredDocuments",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const storedName = "signing-" + hashCode(state.main.signer_attributes.eppn);
    const storedStr = localStorage.getItem(storedName);
    if (storedStr !== null) {
      const storedDocs = JSON.parse(storedStr);
      storedDocs.owned.forEach((doc) => {
        if (doc.state === "failed-signing") {
          thunkAPI.dispatch(setOwnedState(doc));
        }
      });
      storedDocs.invited.forEach((doc) => {
        if (doc.state === "failed-signing") {
          thunkAPI.dispatch(setInvitedState(doc));
        }
      });
    }
    localStorage.removeItem(storedName);
  },
);

/**
 * @public
 * @function dealWithPDFError
 * @desc Function that knows about the errors that can produce the PDF.js library
 * while reading PDFs and translates them to our needs.
 */
const dealWithPDFError = (doc, err, intl) => {
  let message;
  if (err !== undefined && err.message.startsWith("Invalid")) {
    message = intl.formatMessage({
      defaultMessage: "Document seems corrupted",
      id: "validate-problem-corrupted",
    });
  } else if (err !== undefined && err.message === "No password given") {
    message = intl.formatMessage({
      defaultMessage: "Please do not supply a password protected document",
      id: "validate-problem-password",
    });
  } else {
    message = intl.formatMessage({
      defaultMessage: "Document is unreadable",
      id: "validate-problem-unreadable",
    });
  }
  return {
    ...doc,
    message: message,
    state: "failed-loading",
  };
};

/**
 * @public
 * @function validateDoc
 * @desc async function to validate PDF documents
 *
 * Reject documents with the same name as an already loaded document,
 * and then try to read the document with PDF.js to see if it produces any errors.
 */
export const validateDoc = async (doc, intl, state) => {
  let newDoc = null;
  state.template.documents.forEach((document) => {
    if (document.name === doc.name) {
      newDoc = {
        ...doc,
        state: "dup",
      };
    }
  });

  if (newDoc === null) {
    state.documents.documents.forEach((document) => {
      if (document.name === doc.name && document.created !== doc.created) {
        newDoc = {
          ...doc,
          state: "dup",
        };
      }
    });
  }

  if (newDoc === null) {
    state.main.owned_multisign.forEach((document) => {
      if (document.name === doc.name) {
        newDoc = {
          ...doc,
          state: "dup",
        };
      }
    });
  }

  if (newDoc !== null) {
    return newDoc;
  }

  if (doc.state === "dup") {
    return doc;
  }

  if (doc.size > Number(state.main.max_file_size)) {
    return {
      ...doc,
      state: "failed-loading",
      message: intl.formatMessage(
        {
          defaultMessage: "Document is too big (max size: {size})",
          id: "validate-too-big",
        },
        { size: humanFileSize(state.main.max_file_size) },
      ),
    };
  }

  if (doc.type === "application/pdf") {
    return pdfjs
      .getDocument({ url: doc.blob, password: "", stopAtErrors: true })
      .promise.then(() => {
        return {
          ...doc,
          show: false,
          state: "loading",
        };
      })
      .catch((err) => {
        return dealWithPDFError(doc, err, intl);
      });
  } else {
    const domParser = new DOMParser();

    let xmlstr = doc.blob;
    if (xmlstr.includes(",")) {
      xmlstr = xmlstr.split(",")[1];
    }
    xmlstr = atob(xmlstr);
    const xml = domParser.parseFromString(xmlstr, "application/xml");
    if (xml.documentElement.nodeName === "parsererror") {
      return {
        ...doc,
        message: intl.formatMessage({
          defaultMessage: "Document is unreadable",
          id: "validate-problem-unreadable",
        }),
        state: "failed-loading",
      };
    } else {
      return {
        ...doc,
        show: false,
        state: "loading",
      };
    }
  }
};

/**
 * @public
 * @function saveDocument
 * @desc Redux async thunk to save an existing document to IndexedDB
 *
 * Used when the state of some document has changed in redux's central store,
 * to sync the change to the persisted representation in IndexedDB.
 */
export const saveDocument = createAsyncThunk(
  "documents/saveDocument",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.documents.documents.find((d) => {
      return d.name === args.docName;
    });
    await dbSaveDocument(doc);
    return doc;
  },
);

/**
 * @public
 * @function saveTemplate
 * @desc async function to persist a new template
 */
export const saveTemplate = async (thunkAPI, doc) => {
  const state = thunkAPI.getState();
  const newTemplate = await addDocumentToDb(
    doc,
    state.main.signer_attributes.eppn,
  );
  thunkAPI.dispatch(addTemplate(newTemplate));
  return doc;
};

/**
 * @public
 * @function removeDocument
 * @desc Redux async thunk to remove an existing document from IndexedDB
 */
export const removeDocument = createAsyncThunk(
  "documents/removeDocument",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.documents.documents.find((d) => {
      return d.name === args.docName;
    });
    if (doc.id !== undefined) {
      await dbRemoveDocument(doc);
    }
    thunkAPI.dispatch(documentsSlice.actions.rmDocument(doc.name));
  },
);

/**
 * @public
 * @function addDocumentToDb
 * @desc async function to add a new document to IndexedDB
 *
 * This is used when loading a document into the app in createDocument,
 * and when an invitation has been signed by all parties, thus being removed from
 * the backend database, and added to the local IndexedDB database.
 */
export const addDocumentToDb = async (document, name) => {
  const db = await getDb(name);
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
      docRequest.onerror = (event) => {
        reject("Problem saving document");
      };
    });
    return newDoc;
  } else {
    throw new Error("DB absent, cannot save document");
  }
};

/**
 * @function setChangedDocument
 * @desc Update the redux store with changed doc and add it to the IndexedDB database
 */
const setChangedDocument = async (thunkAPI, state, doc) => {
  const docElem = document.getElementById(`local-doc-${doc.name}`);
  if (docElem !== null) {
    docElem.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const newDoc = await addDocumentToDb(doc, state.main.signer_attributes.eppn);
  thunkAPI.dispatch(documentsSlice.actions.setState(newDoc));
  return newDoc;
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
    const state = thunkAPI.getState();
    // First we validate the document
    const doc = await validateDoc(args.doc, args.intl, state);
    if (doc.state === "failed-loading") {
      await setChangedDocument(thunkAPI, state, doc);
      return;
    }

    if (doc.state === "dup") {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "A document with that name has already been loaded",
            id: "save-doc-problem-dup",
          }),
        }),
      );
      thunkAPI.dispatch(documentsSlice.actions.rmDup(doc));
      return;
    }
    let newDoc = null;
    try {
      newDoc = await setChangedDocument(thunkAPI, state, doc);
    } catch (err) {
      // If there was an error saving the document, we mark it as so,
      // and still try to save it to the redux store, so it can be displayed
      // as failed in the UI.
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem adding documents, please try again",
            id: "save-docs-problem-db",
          }),
        }),
      );
      doc.state = "failed-loading";
      doc.message = args.intl.formatMessage({
        defaultMessage: "Problem adding document, please try again",
        id: "save-doc-problem-db",
      });
      await setChangedDocument(thunkAPI, state, doc);
      return;
    }
    // After loading the document locally in the browser, we send it to the backend
    // to be prepared for signing.
    // If this fails, the document is marked as failed, and the user is notified.
    try {
      await thunkAPI.dispatch(
        prepareDocument({ doc: newDoc, intl: args.intl }),
      );
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage:
              "Problem preparing document for signing. Please try again or contact the site administration.",
            id: "save-docs-problem-preparing",
          }),
        }),
      );
      doc.state = "failed-loading";
      doc.message = args.intl.formatMessage({
        defaultMessage: "There was a problem signing the document",
        id: "prepare-doc-problem",
      });
      await setChangedDocument(thunkAPI, state, doc);
      return;
    }
    // Finally we try to update the document persisted in the IndexedDB database
    // with whatever info it has been updated with after being prepared in the backend.
    try {
      await thunkAPI.dispatch(saveDocument({ docName: newDoc.name }));
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage:
              "Problem saving document(s) in session. Please try again or contact the site administration.",
            id: "save-docs-problem-session",
          }),
        }),
      );
      doc.state = "failed-loading";
      doc.message = args.intl.formatMessage({
        defaultMessage: "Problem saving document in session",
        id: "save-doc-problem-session",
      });
      await setChangedDocument(thunkAPI, state, doc);
    }
  },
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
    // Gather document data and send it to the backend to be prepared for signing.
    // In case of error, update the document data with that info.
    const doc = args.doc;
    const docToSend = {
      name: doc.name,
      blob: doc.blob,
      size: doc.size,
      type: doc.type,
    };
    const body = JSON.stringify({ payload: docToSend });
    let data = null;
    try {
      const response = await esFetch("/sign/add-doc", {
        ...postRequest,
        body: body,
      });
      if (response.status === 413) {
        return {
          ...doc,
          state: "failed-preparing",
          message: args.intl.formatMessage({
            defaultMessage: "Problem preparing document, it is too big",
            id: "prepare-big-doc-problem",
          }),
        };
      }
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      return {
        ...doc,
        state: "failed-preparing",
        message: args.intl.formatMessage({
          defaultMessage: "There was a problem signing the document",
          id: "prepare-doc-problem",
        }),
      };
    }
    // If the response from the backend indicates no errors (by having a `payload` key)
    // update its data in the redux store,
    // and if there are errors, also update its data with the error.
    if ("payload" in data) {
      const updatedDoc = {
        ...doc,
        ...data.payload,
        state: "unconfirmed",
      };
      return updatedDoc;
    }
    let msg = args.intl.formatMessage({
      defaultMessage: "There was a problem signing the document",
      id: "prepare-doc-problem",
    });
    if ("message" in data) {
      msg = data.message;
    }
    return {
      ...doc,
      state: "failed-preparing",
      message: msg,
    };
  },
);

/**
 * @public
 * @function startSigning
 * @desc Redux async thunk to tell the backend to create a sign request
 *       with loaded, invited and inviting documents.
 *
 *  This function is called when the user clicks on the "sign selected documents" button.
 *  Here we mark the selected documents as being signed, and, in case some of the
 *  documentws being signed are invitations, we call the `restartSigningDocuments`
 *  function; otherwise, we call the `startSigningDocuments` function.
 *
 *  restartSigningDocuments will try 1st to prepare the documents; in case we are signing
 *  an invitation, this is necessary, since we have never prepared it for signing.
 *
 *  startSigningDocuments will assume optimistically that the documents are already prepared,
 *  and only when it receives information to the contrary (which would indicate that the
 *  preparation has expired), will it resort to calling restartSigningDocuments.
 */
export const startSigning = createAsyncThunk(
  "documents/startSigning",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    let invited = false;
    for (const doc of state.documents.documents) {
      if (doc.state === "selected") {
        thunkAPI.dispatch(
          documentsSlice.actions.startSigningDocument(doc.name),
        );
        await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
      }
    }
    state.main.owned_multisign.forEach((doc) => {
      if (doc.state === "selected") {
        invited = true;
        thunkAPI.dispatch(startSigningOwned(doc.name));
      }
    });
    state.main.pending_multisign.forEach((doc) => {
      if (doc.state === "selected") {
        invited = true;
        thunkAPI.dispatch(startSigningInvited(doc.name));
      }
    });
    if (invited) {
      thunkAPI.dispatch(restartSigningDocuments(args));
    } else {
      thunkAPI.dispatch(startSigningDocuments(args));
    }
  },
);

/**
 * @public
 * @function startSigningDocuments
 * @desc Redux async thunk to tell the backend to create a sign request
 *
 * Here we assume optimistically that the documents are already prepared, and try to
 * directly create a sign request. If the preparation has expired, it will be indicated
 * in the response to `create-sign-request`, and we will resort to calling
 * restartSigningDocuments, that starts preparing the documents.
 *
 * If the creation of the sign request succeeds, the returned data is added to the form
 * to be POSTed to the sign service, and the form is POSTed, to go through the signing
 * process.
 */
export const startSigningDocuments = createAsyncThunk(
  "documents/startSigningDocuments",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = [];
    let data = null;
    // Get the documents to be signed and serialize their metadata to be sent to
    // the `create-sign-request` endpoint.
    for (const doc of state.documents.documents) {
      if (doc.state === "signing") {
        const docToSign = {
          name: doc.name,
          type: doc.type,
          ref: doc.ref,
          key: doc.key,
          sign_requirement: doc.sign_requirement,
        };
        if (docToSign.type.endsWith("/xml")) {
          docToSign.blob = doc.blob;
        }
        docsToSign.push(docToSign);
      }
    }
    const body = preparePayload(state, { documents: docsToSign });
    try {
      const response = await esFetch("/sign/create-sign-request", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);

      // If preparation data had expired for the documents being signed,
      // call restartSigningDocuments
      if (data.error) {
        if (data.message === "expired cache") {
          thunkAPI.dispatch(
            addNotification({
              level: "success",
              message: args.intl.formatMessage({
                defaultMessage: "Please wait...",
                id: "start-signing-please-wait",
              }),
            }),
          );
          await thunkAPI.dispatch(restartSigningDocuments({ intl: args.intl }));
          return;
        }
        throw new Error(data.message);
      }
      const formData = {
        ...data.payload,
      };
      delete formData.documents;

      // Update the form for the sign service
      thunkAPI.dispatch(updateSigningForm(formData));
      // Catch errors and inform the user, and update the state with that information.
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "There was a problem signing the document",
            id: "problem-signing-doc",
          }),
        }),
      );
      const message = args.intl.formatMessage({
        defaultMessage: "There was a problem signing the document",
        id: "problem-signing-doc",
      });
      thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
      if (data.payload.documents !== undefined) {
        for (const doc of data.payload.documents) {
          await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
        }
      }
      return thunkAPI.rejectWithValue(err.toString());
    }
  },
);

/**
 * @public
 * @function restartSigningDocuments
 * @desc Redux async thunk to tell the backend to prepare the documents and create a sign request
 *
 * Gather all documents that have been put in "signing" state (both local documents
 * and invitations) and send them to the backend endpoint `recreate-sign-request` for
 * preprocessing; then, if all went well, use the data in the response from that endpoint
 * to send a POST to the sign service (loosing control of the browser) to be redirected
 * to the IdP's authentication pages.
 *
 * After getting the response from the backend, and before POSTing to the sign service,
 * we compare the data in the response with the document data that was sent in the request,
 * and we update the document data (setting the state of each document to "signing" if
 * all went well, and to an error state if something went wrong), and keeping this
 * document data in localStorage for the documents corresponding to invitations,
 * to be checked after going through the signing process and reloading back the
 * frontside js app.
 */
export const restartSigningDocuments = createAsyncThunk(
  "documents/restartSigningDocuments",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const docsToSign = {
      local: [],
      invited: [],
      owned: [],
    };
    let data = null;
    // gather local documents to be signed
    state.documents.documents.forEach((doc) => {
      if (doc.state === "signing") {
        docsToSign.local.push({
          name: doc.name,
          key: doc.key,
          blob: doc.blob,
          type: doc.type,
          size: doc.size,
        });
      }
    });
    // gather invitations to user to be signed
    state.main.pending_multisign.forEach((doc) => {
      if (doc.state === "signing") {
        docsToSign.invited.push({
          name: doc.name,
          key: doc.key,
          invite_key: doc.invite_key,
          type: doc.type,
          size: doc.size,
        });
      }
    });
    // gather invitations from user to be signed
    state.main.owned_multisign.forEach((doc) => {
      if (doc.state === "signing") {
        docsToSign.owned.push({
          name: doc.name,
          key: doc.key,
          type: doc.type,
          size: doc.size,
        });
      }
    });
    // send data about documents to be signed to the backend
    const body = preparePayload(state, { documents: docsToSign });
    try {
      const response = await esFetch("/sign/recreate-sign-request", {
        ...postRequest,
        body: body,
      });
      // Get data from the response. These data consists mainly of documents successfully
      // preprocessed for signing, and documents that for some reason have failed to be
      // prepared.
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      // data.payload.failed carries objects with keys: key, state (failed-signing),
      // and message (reason for failure).
      // Update the document data with this info, and then store it in local storage.
      // The document data that we keep in local storage is that regarding invitations
      // (both from the user and to the user), since the data regarding non-invitation
      // documents is already kept locally, in IndexedDB.
      docsToSign.local.forEach((doc) => {
        data.payload.failed.forEach((failed) => {
          if (doc.key === failed.key) {
            thunkAPI.dispatch(
              documentsSlice.actions.setState({ name: doc.name, ...failed }),
            );
          }
        });
      });
      docsToSign.owned = docsToSign.owned.map((doc) => {
        let isFailed = false;
        data.payload.failed.forEach((failed) => {
          if (doc.key === failed.key) {
            isFailed = true;
            doc = {
              ...doc,
              ...failed,
            };
          }
        });
        if (!isFailed) doc.state = "signing";
        return doc;
      });
      docsToSign.invited = docsToSign.invited.map((doc) => {
        let isFailed = false;
        data.payload.failed.forEach((failed) => {
          if (doc.key === failed.key) {
            isFailed = true;
            doc = {
              ...doc,
              ...failed,
            };
          }
        });
        if (!isFailed) doc.state = "signing";
        return doc;
      });
      const storageName =
        "signing-" + hashCode(state.main.signer_attributes.eppn);
      const storageContent = JSON.stringify({
        owned: docsToSign.owned,
        invited: docsToSign.invited,
      });
      localStorage.setItem(storageName, storageContent);

      delete data.payload.failed;

      // If there is any data at all in the response from the backend regarding
      // documents successfully prepared for signing, we update the form to be POSTed to
      // the sign service, and submit it.
      //
      // Otherwise, we just check the data stored in local storage, mainly to clean it up,
      // since it is not going to be needed - it is only needed after coming back from the
      // sign service / IdP.
      if (data.payload.documents.length > 0) {
        const formData = { ...data.payload };
        delete formData.documents;
        thunkAPI.dispatch(updateSigningForm(formData));
      } else {
        await thunkAPI.dispatch(checkStoredDocuments());
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "There was a problem signing the document",
            id: "problem-signing-doc",
          }),
        }),
      );
      const message = args.intl.formatMessage({
        defaultMessage: "There was a problem signing the document",
        id: "problem-signing-doc",
      });
      thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
      thunkAPI.dispatch(invitationsSignFailure(message));
      if (
        data.hasOwnProperty("payload") &&
        data.payload.hasOwnProperty("documents")
      ) {
        for (const doc of data.payload.documents) {
          await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
        }
      }
    }
  },
);

/**
 * @public
 * @function fetchSignedDocuments
 * @desc async funtion to get signed documents from the backend.
 *
 * This is called after completing the signing process, and reloading the frontside app
 * after leaving the IdP.
 *
 * The data needed to retrieve the signed documents is placed in a DOM element as a dateset.
 */
const fetchSignedDocuments = async (thunkAPI, dataElem, intl) => {
  const state = thunkAPI.getState();
  const payload = {
    sign_response: dataElem.dataset.signresponse,
    relay_state: dataElem.dataset.relaystate,
  };
  const body = preparePayload(state, payload);
  let data = null;
  try {
    // Send request to the `get-signed` endpoint to get the signed documents
    const response = await esFetch("/sign/get-signed", {
      ...postRequest,
      body: body,
    });
    data = await checkStatus(response);
    extractCsrfToken(thunkAPI.dispatch, data);
    if (data.error) {
      throw new Error(data.message);
    }
    if ("message" in data) {
      // Show the user any message received in the response
      const level = data.error ? "danger" : "success";
      thunkAPI.dispatch(
        addNotification({ level: level, message: data.message }),
      );
    }
    // Update the documents kept locally in IndexedDB with the signed content
    for (const doc of data.payload.documents) {
      for (const oldDoc of state.documents.documents) {
        if (doc.id === oldDoc.key) {
          thunkAPI.dispatch(
            documentsSlice.actions.updateDocumentWithSignedContent(doc),
          );
          await thunkAPI.dispatch(saveDocument({ docName: oldDoc.name }));
        }
      }
      // In the case of documents corresponding to invitations from the owner,
      // in which case all invited parties have signed
      // and the document has been removed from the backend database,
      // we must add them to the browser's local IndexedDB database,
      // and also remove them from the collection (in the redux store)
      // of invitations pending to be signed, and add them to the collection
      // (in the redux store) of non-invitation documents.
      for (const oldDoc of state.main.owned_multisign) {
        if (doc.id === oldDoc.key) {
          let newSigned = [...oldDoc.signed];
          newSigned.push({
            name: state.main.signer_attributes.name,
            email: state.main.signer_attributes.mail,
          });
          let prefix = "data:application/xml;base64,";
          if (oldDoc.type === "application/pdf") {
            prefix = "data:application/pdf;base64,";
          }
          const signedContent = prefix + doc.signed_content;
          let newDoc = {
            ...oldDoc,
            signedContent: signedContent,
            blob: signedContent,
            state: "signed",
            show: false,
            showForced: false,
            signed: newSigned,
            validated: doc.validated,
            pprinted: doc.pprinted,
          };
          thunkAPI.dispatch(removeOwned({ key: doc.id }));
          newDoc = await addDocumentToDb(
            newDoc,
            state.main.signer_attributes.eppn,
          );
          thunkAPI.dispatch(documentsSlice.actions.addDocument(newDoc));
        }
      }
      thunkAPI.dispatch(finishInvited({doc: doc, intl: intl}));
    }
    await thunkAPI.dispatch(checkStoredDocuments());
  } catch (err) {
    // In case of errors, notify the user, and update the state.
    thunkAPI.dispatch(
      addNotification({
        level: "danger",
        message: intl.formatMessage({
          defaultMessage: "Problem getting signed documents, please try again later",
          id: "problem-getting-signed",
        }),
      }),
    );
    let message;
    if (data && data.message) {
      message = data.message;
    } else {
      message = intl.formatMessage({
        defaultMessage: "There was a problem signing the document",
        id: "problem-signing-doc",
      });
    }
    thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
    thunkAPI.dispatch(invitationsSignFailure(message));
    if (data && data.payload && data.payload.documents) {
      for (const doc of data.payload.documents) {
        await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
      }
    }
  }
};

/**
 * @public
 * @function downloadSigned
 * @desc Redux async thunk to hand a single signed document to the user.
 *
 * Using FileSaver.js
 */
export const downloadSigned = createAsyncThunk(
  "documents/downloadSigned",
  async (docname, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.documents.documents.find((d) => {
      return d.name === docname;
    });
    const b64content = doc.signedContent.split(",")[1];
    const blob = b64toBlob(b64content, doc.type);
    const newName = nameForDownload(doc.name, "signed");
    FileSaver.saveAs(blob, newName);
  },
);

/**
 * @public
 * @function downloadAllSigned
 * @desc Redux async thunk to hand signed documents to the user.
 *
 * First the documents are gathered from the redux store,
 * then they are bundled into a zip,
 * and then they are handed to the user, using FileSaver.js.
 */
export const downloadAllSigned = createAsyncThunk(
  "documents/downloadAllSigned",
  async (args, thunkAPI) => {
      console.log("1111111111111111111111111111111111111111111111111111");
    const state = thunkAPI.getState();
    let docs = state.documents.documents.filter((doc) => {
      return doc.state === "signed";
    });
      console.log("2222222222222222222222222222222222222222222222222222");
    docs = docs.concat(
      state.main.pending_multisign.filter((doc) => {
        return doc.state === "signed";
      }),
    );
    const zip = await new JSZip();
      console.log("33333333333333333333333333333333333333333333333333333");
    const folder = await zip.folder("signed");
      console.log("4444444444444444444444444444444444444444444444444", docs.length, typeof(docs));
    for await (const doc of docs) {
      console.log("55555555555555555555555555444444444444444444444444444");
      //const b64content = await doc.signedContent.split(",")[1];
      const b64content1 = await doc.signedContent;
      console.log("llllllllllllllllllllllllllllllllllllllllll");
      const b64content2 = await b64content1.split(",");
      console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm");
      const b64content = await b64content2[1];
      console.log("nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
      const blob = b64toBlob(b64content, doc.type);
      console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
      const newName = nameForDownload(doc.name, "signed");
      console.log("5555555555555555555555555555555555555555555555555555");
      await folder.file(newName, blob);
      console.log("66666666666666666666666666666666666666666666666666666");
    }
      console.log("777777777777777777777777777777777777777777777777777");
    await zip.generateAsync({ type: "blob" }).then(async function (content) {
      console.log("FFFFFFFFFFFFFFFFFFFFFFFFFUUUUUUUUUUUUUUUUUUUUUUUUUUUUU");
      await FileSaver.saveAs(content, "signed.zip");
      console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCKKKKKKKKKKKKKKKKKKKKKKKKKK");
    });
  },
);

/**
 * @public
 * @function skipOwnedSignature
 * @desc Redux async thunk to skip the final signature of a multi signed document
 */
export const skipOwnedSignature = createAsyncThunk(
  "main/skipOwnedSignature",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    let data = null;
    const docToSkip = {
      key: args.doc.key,
    };

    // Send the ID of the concerned document to the
    // `skip-final-signature` endpoint in the backend.
    const body = preparePayload(state, docToSkip);
    try {
      const response = await esFetch("/sign/skip-final-signature", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }

      // Get the data for the concerned document from the local redux store
      const key = data.payload.documents[0].id;
      const owned = state.main.owned_multisign.find((d) => {
        return d.key === key;
      });

      // Reconstruct the representation of the document
      // with data kept locally and data (the signed document contents) received from the backend
      let prefix = "data:application/xml;base64,";
      if (owned.type === "application/pdf") {
        prefix = "data:application/pdf;base64,";
      }
      const doc = {
        ...owned,
        signedContent: prefix + data.payload.documents[0].signed_content,
        blob: prefix + data.payload.documents[0].signed_content,
        state: "signed",
        show: false,
        pprinted: data.payload.documents[0].pprinted,
      };

      // Remove the document from the collection of invitations to the user in the redux store,
      // and add it to the IndexedDB database
      // and to the collection of non-invitation documents in the redux store.
      thunkAPI.dispatch(removeOwned({ key: doc.key }));
      const newDoc = await addDocumentToDb(
        doc,
        state.main.signer_attributes.eppn,
      );
      thunkAPI.dispatch(documentsSlice.actions.addDocument(newDoc));

      // In case of errors, inform the user.
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage:
              "Problem skipping final signature, please try again",
            id: "problem-skipping-signature",
          }),
        }),
      );
    }
  },
);

const documentsSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
  },
  reducers: {
    /**
     * @public
     * @function setDocuments
     * @desc Redux action to set the list of documents in the store
     */
    setDocuments(state, action) {
      state.documents = action.payload;
    },
    /**
     * @public
     * @function showPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the show key to true (so that the UI will show a preview of the document).
     */
    showPreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.key === action.payload) {
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
     * @function showForcedPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the show key to true (so that the UI will show the forced preview of the document).
     */
    showForcedPreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            showForced: true,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideForcedPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the showForced key to false (so that the UI will hide the forced preview of the document).
     */
    hideForcedPreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            showForced: false,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function confirmForcedPreview
     * @desc Redux action to update a document in the documents state key,
     * setting the showForced key to false (so that the UI will hide the forced preview of the document,
     * and the document will end in the 'selected' state).
     */
    confirmForcedPreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            showForced: false,
            state: "selected",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function rmDocument
     * @desc Redux action to remove a document from the store
     */
    rmDocument(state, action) {
      state.documents = state.documents.filter((doc) => {
        return doc.name !== action.payload;
      });
    },
    /**
     * @public
     * @function rmDup
     * @desc Redux action to remove a duplicate document from the store
     */
    rmDup(state, action) {
      state.documents = state.documents.filter((doc) => {
        return (
          doc.name !== action.payload.name ||
          doc.created !== action.payload.created
        );
      });
    },
    /**
     * @public
     * @function rmDocumentByKey
     * @desc Redux action to remove a document from the store
     */
    rmDocumentByKey(state, action) {
      state.documents = state.documents.filter((doc) => {
        return doc.key !== action.payload;
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
        if (doc.key === action.payload.id) {
          let prefix = "data:application/xml;base64,";
          if (doc.type === "application/pdf") {
            prefix = "data:application/pdf;base64,";
          }
          const signedContent = prefix + action.payload.signed_content;
          const document = {
            ...doc,
            signedContent: signedContent,
            blob: signedContent,
            state: "signed",
            validated: action.payload.validated,
            pprinted: action.payload.pprinted,
          };
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
    signFailure(state, action) {
      const message = action.payload;
      state.documents = state.documents.map((doc) => {
        if (doc.state === "signing") {
          return {
            ...doc,
            state: "failed-signing",
            message: message,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setState
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
    /**
     * @public
     * @function addDocument
     * @desc Redux action to add new document to the redux store
     */
    addDocument(state, action) {
      state.documents.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDocuments.rejected, (state, action) => {
        if (action.hasOwnProperty("payload") && action.payload !== undefined) {
          state.documents = action.payload.documents;
        }
      })
      .addCase(prepareDocument.fulfilled, (state, action) => {
        let added = false;
        state.documents = state.documents.map((doc) => {
          if (doc.name === action.payload.name) {
            added = true;
            return {
              ...action.payload,
            };
          } else return doc;
        });
        if (!added) state.documents.push({ ...action.payload });
      })

      .addCase(prepareDocument.rejected, (state, action) => {
        let added = false;
        state.documents = state.documents.map((doc) => {
          if (doc.name === action.payload.name) {
            added = true;
            return {
              ...action.payload,
            };
          } else return doc;
        });
        if (!added) state.documents.push({ ...action.payload });
      });
  },
});

export const {
  showPreview,
  showForcedPreview,
  hidePreview,
  hideForcedPreview,
  confirmForcedPreview,
  removeAllDocuments,
  setState,
  toggleDocSelection,
  rmDocument,
  addDocument,
  rmDocumentByKey,
} = documentsSlice.actions;

export default documentsSlice.reducer;
