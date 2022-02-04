/**
 * @module slices/Documents
 * @desc Here we define the initial state for the documents key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The documents key of the state holds the documents added by the user to be signed,
 * in whatever stage of the signing procedure they may be.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { pdfjs } from "react-pdf/dist/esm/entry.webpack";
import * as FileSaver from "file-saver";
import JSZip from "jszip";

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import {
  updateSigningForm,
  addOwned,
  removeOwned,
  updateOwned,
  finishInvited,
  startSigningInvited,
  startSigningOwned,
  setOwnedState,
  setInvitedState,
  updateInvitations,
  invitationsSignFailure,
  updateInvitationsFailed,
} from "slices/Main";
import { setPolling } from "slices/Poll";
import { unsetSpinning } from "slices/Button";
import { dbSaveDocument, dbRemoveDocument } from "init-app/database";
import { getDb } from "init-app/database";
import { b64toBlob, hashCode, nameForCopy } from "components/utils";

/**
 * @public
 * @function loadDocuments
 * @desc Redux async thunk to load documents saved in IndexedDB.
 */
export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (args, thunkAPI) => {
    const db = await getDb(args.eppn);
    const state = thunkAPI.getState();

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
            const doc = cursor.value;
            if (doc.state === "signing") {
              signing = true;
            }
            docs.push(doc);
            cursor.continue();
          }
          if (cursor === null) {
            resolve(docs);
          }
        };
      });
      let documents = await promisedDocuments;
      let dataElem = null;
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
                    id: "load-doc-problem-signing",
                  }),
                };
                await dbSaveDocument(failedDoc);
                return failedDoc;
              } else return doc;
            })
          );
          thunkAPI.dispatch(
            updateInvitationsFailed({
              message: args.intl.formatMessage({
                defaultMessage:
                  "The signing process was interrupted, please try again.",
                id: "load-doc-interrupted-signing",
              }),
            })
          );
        }
      }
      documents = await Promise.all(
        documents.map(async (doc) => {
          if (doc.state === "loading") {
            const failedDoc = {
              ...doc,
              state: "failed-preparing",
              message: args.intl.formatMessage({
                defaultMessage:
                  "There was a problem preparing the document, please try again",
                id: "load-doc-problem-preparing",
              }),
            };
            await dbSaveDocument(failedDoc);
            return failedDoc;
          } else return doc;
        })
      );
      thunkAPI.dispatch(documentsSlice.actions.setDocuments(documents));
      if (signing && dataElem !== null) {
        await fetchSignedDocuments(thunkAPI, dataElem, args.intl);
      } else {
        localStorage.removeItem(storageName);
      }
    } else {
      return {
        documents: [],
      };
    }
  }
);

/**
 * @public
 * @function checkStoredDocuments
 * @desc Redux async thunk to load documents saved in IndexedDB.
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
  }
);

const dealWithPDFError = (doc, err, intl) => {
  if (err !== undefined && err.message.startsWith("Invalid")) {
    doc.message = intl.formatMessage({
      defaultMessage: "Document seems corrupted",
      id: "validate-problem-corrupted",
    });
  } else if (err !== undefined && err.message === "No password given") {
    doc.message = intl.formatMessage({
      defaultMessage: "Please do not supply a password protected document",
      id: "validate-problem-password",
    });
  } else {
    doc.message = intl.formatMessage({
      defaultMessage: "Document is unreadable",
      id: "validate-problem-unreadable",
    });
  }
  doc.state = "failed-loading";
  return doc;
};

/**
 * @public
 * @function validateDoc
 * @desc async function to validate PDF documents
 */
async function validateDoc(doc, intl, state) {
  state.documents.documents.forEach((document) => {
    if (document.name === doc.name) {
      doc.state = "dup";
    }
  });

  state.main.owned_multisign.forEach((document) => {
    if (document.name === doc.name) {
      doc.state = "dup";
    }
  });

  if (doc.state === "dup") {
    return doc;
  }

  return await pdfjs
    .getDocument({ url: doc.blob, password: "", stopAtErrors: true })
    .promise.then(() => {
      doc.show = false;
      doc.state = "loading";
      return doc;
    })
    .catch((err) => {
      console.log("Error reading PDF doc", err);
      return dealWithPDFError(doc, err, intl);
    });
}

/**
 * @public
 * @function saveDocument
 * @desc Redux async thunk to save an existing document to IndexedDB
 */
export const saveDocument = createAsyncThunk(
  "documents/saveDocument",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.documents.documents.filter((d) => {
      return d.name === args.docName;
    })[0];
    await dbSaveDocument(doc);
    return doc;
  }
);

/**
 * @public
 * @function removeDocument
 * @desc Redux async thunk to remove an existing document from IndexedDB
 */
export const removeDocument = createAsyncThunk(
  "documents/removeDocument",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.documents.documents.filter((d) => {
      return d.name === args.docName;
    })[0];
    if (doc.id !== undefined) {
      await dbRemoveDocument(doc);
    }
    thunkAPI.dispatch(documentsSlice.actions.rmDocument(doc.name));
  }
);

/**
 * @public
 * @function addDocumentToDb
 * @desc async function to add a new document to IndexedDB
 */
const addDocumentToDb = async (document, name) => {
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
    const state = thunkAPI.getState();
    const doc = await validateDoc(args.doc, args.intl, state);
    if (doc.state === "failed-loading") {
      return thunkAPI.rejectWithValue(doc);
    }

    if (doc.state === "dup") {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: "",
          message: args.intl.formatMessage({
            defaultMessage: "A document with that name has already been loaded",
            id: "save-doc-problem-dup",
          }),
        })
      );
      return thunkAPI.rejectWithValue(doc);
    }
    let newDoc = null;
    try {
      thunkAPI.dispatch(documentsSlice.actions.addDocument(doc));
      newDoc = await addDocumentToDb(doc, state.main.signer_attributes.eppn);
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem adding documents, please try again",
            id: "save-docs-problem-db",
          }),
        })
      );
      doc.state = "failed-loading";
      doc.message = args.intl.formatMessage({
        defaultMessage: "Problem adding document, please try again",
        id: "save-doc-problem-db",
      });
      return thunkAPI.rejectWithValue(doc);
    }
    try {
      await thunkAPI.dispatch(
        prepareDocument({ doc: newDoc, intl: args.intl })
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
        })
      );
      doc.state = "failed-preparing";
      doc.message = args.intl.formatMessage({
        defaultMessage: "Problem preparing document for signing",
        id: "save-doc-problem-preparing",
      });
      return thunkAPI.rejectWithValue(doc);
    }
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
        })
      );
      doc.state = "failed-preparing";
      doc.message = args.intl.formatMessage({
        defaultMessage: "Problem saving document in session",
        id: "save-doc-problem-session",
      });
      return thunkAPI.rejectWithValue(doc);
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
      const response = await fetch("/sign/add-doc", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      return {
        ...doc,
        state: "failed-preparing",
        message: args.intl.formatMessage({
          defaultMessage: "Problem preparing document, please try again",
          id: "prepare-doc-problem",
        }),
      };
    }
    if ("payload" in data) {
      const updatedDoc = {
        ...doc,
        ...data.payload,
        state: "unconfirmed",
      };
      return updatedDoc;
    }
    let msg = args.intl.formatMessage({
      defaultMessage: "Problem preparing document, please try again",
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
  }
);

/**
 * @public
 * @function startSigning
 * @desc Redux async thunk to tell the backend to create a sign request
 *       with loaded, invited and inviting documents
 */
export const startSigning = createAsyncThunk(
  "documents/startSigning",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    await state.documents.documents.forEach(async (doc) => {
      if (doc.state === "selected") {
        thunkAPI.dispatch(
          documentsSlice.actions.startSigningDocument(doc.name)
        );
        await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
      }
    });
    let invited = false;
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
    await state.documents.documents.forEach(async (doc) => {
      if (doc.state === "signing") {
        docsToSign.push({
          name: doc.name,
          type: doc.type,
          ref: doc.ref,
          key: doc.key,
          sign_requirement: doc.sign_requirement,
        });
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
              message: args.intl.formatMessage({
                defaultMessage: "Please wait...",
                id: "start-signing-please-wait",
              }),
            })
          );
          await thunkAPI.dispatch(restartSigningDocuments({ intl: args.intl }));
          return;
        }

        throw new Error(data.message);
      }
      delete data.payload.documents;

      thunkAPI.dispatch(updateSigningForm(data.payload));
      const form = document.getElementById("signing-form");
      if (form.requestSubmit) {
        form.requestSubmit();
      } else {
        form.submit();
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem creating signature request",
            id: "problem-creating-sign-request",
          }),
        })
      );
      const message = args.intl.formatMessage({
        defaultMessage: "Problem signing the document",
        id: "problem-signing",
      });
      thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
      await data.payload.documents.forEach(async (doc) => {
        await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
      });
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
    const docsToSign = {
      local: [],
      invited: [],
      owned: [],
    };
    let data = null;
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
      // failed carries objects with keys: key, state (failed-signing), message
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

      if (data.payload.documents.length > 0) {
        delete data.payload.documents;
        thunkAPI.dispatch(updateSigningForm(data.payload));
        const form = document.getElementById("signing-form");
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.submit();
        }
      } else {
        await thunkAPI.dispatch(checkStoredDocuments());
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem creating signature request",
            id: "problem-creating-sign-request",
          }),
        })
      );
      const message = args.intl.formatMessage({
        defaultMessage: "Problem signing the document",
        id: "problem-signing",
      });
      thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
      thunkAPI.dispatch(invitationsSignFailure(message));
      if (
        data.hasOwnProperty("payload") &&
        data.payload.hasOwnProperty("documents")
      ) {
        await data.payload.documents.forEach(async (doc) => {
          await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
        });
      }
    }
  }
);

/**
 * @public
 * @function fetchSignedDocuments
 * @desc async funtion to get signed documents from the backend.
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
    await data.payload.documents.forEach(async (doc) => {
      await state.documents.documents.forEach(async (oldDoc) => {
        if (doc.id === oldDoc.key) {
          thunkAPI.dispatch(
            documentsSlice.actions.updateDocumentWithSignedContent(doc)
          );
          await thunkAPI.dispatch(saveDocument({ docName: oldDoc.name }));
        }
      });
      await state.main.owned_multisign.forEach(async (oldDoc) => {
        if (doc.id === oldDoc.key) {
          let newSigned = [...oldDoc.signed];
          newSigned.push({
            name: state.main.signer_attributes.name,
            email: state.main.signer_attributes.mail,
          });
          let newDoc = {
            ...oldDoc,
            signedContent: "data:application/pdf;base64," + doc.signed_content,
            blob: "data:application/pdf;base64," + doc.signed_content,
            state: "signed",
            show: false,
            showForced: false,
            signed: newSigned,
          };
          thunkAPI.dispatch(removeOwned({ key: doc.id }));
          newDoc = await addDocumentToDb(
            newDoc,
            state.main.signer_attributes.eppn
          );
          thunkAPI.dispatch(documentsSlice.actions.addDocument(newDoc));
        }
      });
      thunkAPI.dispatch(finishInvited(doc));
    });
    await thunkAPI.dispatch(checkStoredDocuments());
  } catch (err) {
    thunkAPI.dispatch(
      addNotification({
        level: "danger",
        message: intl.formatMessage({
          defaultMessage: "Problem getting signed documents",
          id: "problem-getting-signed",
        }),
      })
    );
    const message = intl.formatMessage({
      defaultMessage: "Problem signing the document",
      id: "problem-signing",
    });
    thunkAPI.dispatch(documentsSlice.actions.signFailure(message));
    thunkAPI.dispatch(invitationsSignFailure(message));
    if (data && data.payload && data.payload.documents) {
      await data.payload.documents.forEach(async (doc) => {
        await thunkAPI.dispatch(saveDocument({ docName: doc.name }));
      });
    }
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
    const doc = state.documents.documents.filter((d) => {
      return d.name === docname;
    })[0];
    const b64content = doc.signedContent.split(",")[1];
    const blob = b64toBlob(b64content);
    const newName = doc.name.split(".").slice(0, -1).join(".") + "-signed.pdf";
    FileSaver.saveAs(blob, newName);
  }
);

/**
 * @public
 * @function downloadAllSigned
 * @desc Redux async thunk to hand signed documents to the user.
 */
export const downloadAllSigned = createAsyncThunk(
  "documents/downloadAllSigned",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    let docs = state.documents.documents.filter((doc) => {
      return doc.state === "signed";
    });
    docs = docs.concat(
      state.main.pending_multisign.filter((doc) => {
        return doc.state === "signed";
      })
    );
    let zip = new JSZip();
    let folder = zip.folder("signed");
    docs.forEach((doc) => {
      const b64content = doc.signedContent.split(",")[1];
      const blob = b64toBlob(b64content);
      const newName =
        doc.name.split(".").slice(0, -1).join(".") + "-signed.pdf";
      folder.file(newName, blob);
    });
    zip.generateAsync({ type: "blob" }).then(function (content) {
      FileSaver.saveAs(content, "signed.zip");
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

    let state = thunkAPI.getState();

    let document = state.documents.documents.filter((doc) => {
      return doc.id === documentId;
    })[0];

    const owner = state.main.signer_attributes.mail;

    if (args.values.makecopyChoice) {
      const docName = nameForCopy(document.name);
      const newDoc = {
        name: docName,
        blob: document.blob,
        size: document.size,
        type: document.type,
      };
      await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));
      state = thunkAPI.getState();
      document = state.documents.documents.filter((doc) => {
        return doc.name === docName;
      })[0];
      thunkAPI.dispatch(setState({ name: docName, state: "loaded" }));
    }

    const dataToSend = {
      owner: owner,
      invites: invitees,
      text: args.values.invitationText,
      sendsigned: args.values.sendsignedChoice,
      loa: args.values.loa.join(";"),
      document: {
        key: document.key,
        name: document.name,
        blob: document.blob.split(",")[1],
        size: document.size,
        type: document.type,
        prev_signatures: document.prev_signatures,
      },
    };
    const body = preparePayload(state, dataToSend);
    let data = null;
    try {
      const response = await fetch("/sign/create-multi-sign", {
        ...postRequest,
        body: body,
      });
      if (response.status === 502) {
        // Backend side worker timeout,
        // Invitation has been persisted but emails were not sent,
        // So let's remove it.
        const dataToSend_rm = {
          key: document.key,
        };
        const body_rm = preparePayload(state, dataToSend_rm);
        const response = await fetch("/sign/remove-multi-sign", {
          ...postRequest,
          body: body_rm,
        });
        data = await checkStatus(response);
        extractCsrfToken(thunkAPI.dispatch, data);

        throw new Error("502 when trying to send invitations");
      }
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      const message = args.intl.formatMessage({
        defaultMessage: "Problem sending invitations to sign, please try again",
        id: "problem-sending-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return thunkAPI.rejectWithValue(null);
    }
    if (data.error) {
      const message = args.intl.formatMessage({
        defaultMessage: "Problem creating invitation to sign, please try again",
        id: "problem-creating-multisign",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return thunkAPI.rejectWithValue(null);
    }
    const owned = {
      key: document.key,
      name: document.name,
      size: document.size,
      type: document.type,
      prev_signatures: document.prev_signatures,
      state: "incomplete",
      pending: invitees,
      signed: [],
      declined: [],
    };
    await thunkAPI.dispatch(removeDocument({ docName: document.name }));
    thunkAPI.dispatch(addOwned(owned));
    thunkAPI.dispatch(setPolling(true));
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
      const message = args.intl.formatMessage({
        defaultMessage: "Problem removing multi sign request, please try again",
        id: "problem-removing-multisign",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    if (data.error) {
      const message = args.intl.formatMessage({
        defaultMessage: "Problem removing multi sign request, please try again",
        id: "problem-removing-multisign",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    const owned = {
      key: document.key,
    };
    thunkAPI.dispatch(removeOwned(owned));
    const message = args.intl.formatMessage({
      defaultMessage: "Success removing multi sign request",
      id: "success-removing-multisign",
    });
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
    const text = args.values["re-invitationText"];

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
      const message = args.intl.formatMessage({
        defaultMessage: "Problem sending invitations to sign, please try again",
        id: "problem-sending-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    if (data.error) {
      const message = args.intl.formatMessage({
        defaultMessage: "Problem sending invitations to sign, please try again",
        id: "problem-sending-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    const message = args.intl.formatMessage({
      defaultMessage: "Success resending invitations to sign",
      id: "success-sending-invitations",
    });
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  }
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
    const body = preparePayload(state, docToSkip);
    try {
      const response = await fetch("/sign/skip-final-signature", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      const key = data.payload.documents[0].id;
      const owned = state.main.owned_multisign.filter((d) => {
        return d.key === key;
      })[0];

      const doc = {
        ...owned,
        signedContent:
          "data:application/pdf;base64," +
          data.payload.documents[0].signed_content,
        blob:
          "data:application/pdf;base64," +
          data.payload.documents[0].signed_content,
        state: "signed",
        show: false,
      };
      thunkAPI.dispatch(removeOwned({ key: doc.key }));
      const newDoc = await addDocumentToDb(
        doc,
        state.main.signer_attributes.eppn
      );
      thunkAPI.dispatch(documentsSlice.actions.addDocument(newDoc));
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage:
              "Problem skipping final signature, please try again",
            id: "problem-skipping-signature",
          }),
        })
      );
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
          const document = {
            ...doc,
            signedContent:
              "data:application/pdf;base64," + action.payload.signed_content,
            state: "signed",
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
    /**
     * @public
     * @function addDocument
     * @desc Redux action to add new document to the redux store
     */
    addDocument(state, action) {
      state.documents.push(action.payload);
    },
  },
  extraReducers: {
    [createDocument.rejected]: (state, action) => {
      if (action.payload !== undefined && action.payload.state !== "dup") {
        state.documents.push(action.payload);
      }
    },
    [loadDocuments.rejected]: (state, action) => {
      if (action.hasOwnProperty("payload") && action.payload !== undefined) {
        state.documents = action.payload.documents;
      }
    },
    [prepareDocument.fulfilled]: (state, action) => {
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
    },

    [prepareDocument.rejected]: (state, action) => {
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
    },

    [sendInvites.fulfilled]: (state, action) => {
      state.documents = state.documents.filter((doc) => {
        return doc.key !== action.payload;
      });
    },
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
} = documentsSlice.actions;

export default documentsSlice.reducer;
