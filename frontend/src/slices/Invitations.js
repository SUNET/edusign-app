import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
  esFetch,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { addOwned, removeOwned, updateOwned } from "slices/Main";
import { isInviting } from "slices/InviteForm";
import {
  createDocument,
  addDocument,
  addDocumentToDb,
  setState,
  rmDocument,
  rmDocumentByKey,
  saveTemplate,
  removeDocument,
} from "slices/Documents";
import { setPolling } from "slices/Poll";
import { dbRemoveDocument } from "init-app/database";

/**
 * @public
 * @function sendInvites
 * @desc Redux async thunk to create an invitation to sign documents.
 *
 * This is triggered from the submit button in the form in InviteForm.
 *
 * Here we first gather the data entered in the form, including the id of the document
 * to be signed by the invitees;
 */
export const sendInvites = createAsyncThunk(
  "main/sendInvites",
  async (args, thunkAPI) => {
    thunkAPI.dispatch(isInviting());
    let state = thunkAPI.getState();
    const documentId = state.modals.form_id;
    const invitees = args.values.invitees.map((invitee) => ({
      name: invitee.name,
      email: invitee.email,
      lang: invitee.lang,
    }));
    const isTemplate = args.values.isTemplate;
    const ordered =
      args.values.orderedChoice !== undefined
        ? args.values.orderedChoice
        : false;
    const sendsigned =
      args.values.sendsignedChoice !== undefined
        ? args.values.sendsignedChoice
        : false;
    const skipfinal =
      args.values.skipfinalChoice !== undefined
        ? args.values.skipfinalChoice
        : false;

    let document;
    if (isTemplate) {
      document = state.template.documents.find((doc) => {
        return doc.id === documentId;
      });
    } else {
      document = state.documents.documents.find((doc) => {
        return doc.id === documentId;
      });
    }

    const owner = state.main.signer_attributes.mail;

    if (document.state === "signed") {
      document = { ...document };
      await thunkAPI.dispatch(removeDocument({ docName: document.name }));
      thunkAPI.dispatch(addDocument(document));
      await thunkAPI.dispatch(
        createDocument({ doc: document, intl: args.intl }),
      );
      state = thunkAPI.getState();
      document = state.documents.documents.find((doc) => {
        return doc.name === document.name;
      });
    }

    if (isTemplate) {
      // If we want to create the invitation on a copy of the document,
      // keeping the original unsigned as a template,
      // we create the copy here.
      const docName = args.values.newnameInput;
      const newDoc = {
        name: docName,
        blob: document.blob,
        size: document.size,
        type: document.type,
        created: Date.now(),
      };
      thunkAPI.dispatch(addDocument(newDoc));
      await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));

      // The previously gotten state is out of date by now
      state = thunkAPI.getState();
      const newDocument = state.documents.documents.find((doc) => {
        return doc.name === docName;
      });
      thunkAPI.dispatch(setState({ name: docName, state: "loaded" }));
      document = newDocument;
    }
    const loa = args.values.loa !== undefined ? args.values.loa : "low";
    // We send the gathered data to the `create-multi-sign` endpoint in the backend.
    const dataToSend = {
      owner: owner,
      invites: invitees,
      text: args.values.invitationText,
      sendsigned: sendsigned,
      skipfinal: skipfinal,
      loa: loa,
      ordered: ordered,
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
      const response = await esFetch("/sign/create-multi-sign", {
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
        const response = await esFetch("/sign/remove-multi-sign", {
          ...postRequest,
          body: body_rm,
        });
        data = await checkStatus(response);
        extractCsrfToken(thunkAPI.dispatch, data);

        throw new Error("502 when trying to send invitations");
      }
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      // In case of errors, inform the user, update the app state.
      const message = args.intl.formatMessage({
        defaultMessage: "Problem sending invitations to sign, please try again",
        id: "problem-sending-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return thunkAPI.rejectWithValue(null);
    }

    let display_loa = args.intl.formatMessage({
      defaultMessage: "Low",
      id: "loa-name-low",
    });
    if (loa === "medium") {
      display_loa = args.intl.formatMessage({
        defaultMessage: "Medium",
        id: "loa-name-medium",
      });
    } else if (loa === "high") {
      display_loa = args.intl.formatMessage({
        defaultMessage: "High",
        id: "loa-name-high",
      });
    }
    // If there are no errors, remove the original document from the collection (in the redux state)
    // of non-invitation documents, and add it to the collection of documents invited by the user.
    const owned = {
      key: document.key,
      name: document.name,
      size: document.size,
      type: document.type,
      prev_signatures: document.prev_signatures,
      state: "incomplete",
      pending: args.values.invitees,
      signed: [],
      declined: [],
      created: Date.now(),
      loa: `${loa},${display_loa}`,
      ordered: ordered,
      skipfinal: skipfinal,
      sendsigned: sendsigned,
    };
    await thunkAPI.dispatch(removeDocument({ docName: document.name }));
    thunkAPI.dispatch(addOwned(owned));

    // Start polling the backend, to update the local state when users invited to sign do sign.
    thunkAPI.dispatch(setPolling(true));
    thunkAPI.dispatch(rmDocumentByKey(document.key));
  },
);

/**
 * @public
 * @function editInvites
 * @desc Redux async thunk to edit an invitation to sign documents.
 *
 * This is triggered from the submit button in the form in InviteEditForm.
 */
export const editInvites = createAsyncThunk(
  "main/editInvites",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const documentKey = args.values.documentKey;
    const invitees = args.values.invitees;

    const doc = state.main.owned_multisign.find((doc) => {
      return doc.key === documentKey;
    });

    if (invitees.length === 0) {
      if (doc.signed.length === 0) {
        await editInvitesBackToPersonal(doc, thunkAPI, args.intl);
      } else {
        await editInvitesPending(args.values, thunkAPI, args.intl);
      }
    } else {
      await editInvitesPending(args.values, thunkAPI, args.intl);
    }
  },
);

/**
 * @public
 * @function editInvitesBackToPersonal
 * @desc async function to edit an invitation to sign a document if after
 *      the edition there are no pending invitation left,
 *      and additionally it has not been yet signed by anyone.
 *      The document is removed from the backend, and put back
 *      in the personal documents list.
 *
 * This is called from the editInvites async thunk
 */
const editInvitesBackToPersonal = async (doc, thunkAPI, intl) => {
  let state = thunkAPI.getState();
  const owned = {
    key: doc.key,
  };
  let body = preparePayload(state, owned);
  let contentData;
  let data;
  try {
    const response1 = await esFetch("/sign/get-partially-signed", {
      ...postRequest,
      body: body,
    });
    contentData = await checkStatus(response1);
    extractCsrfToken(thunkAPI.dispatch, contentData);
    if (contentData.error) {
      throw new Error(contentData.message);
    }
    state = thunkAPI.getState();
    body = preparePayload(state, owned);
    const response2 = await esFetch("/sign/remove-multi-sign", {
      ...postRequest,
      body: body,
    });
    data = await checkStatus(response2);
    extractCsrfToken(thunkAPI.dispatch, data);
    if (data.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    // in case of errors, inform the user, and update the local state.
    const message = intl.formatMessage({
      defaultMessage: "Problem editing invitation to sign, please try again",
      id: "problem-editing-invitation",
    });
    thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
    return;
  }
  // If the request to the backend is successful, remove the representation
  // of the document from the collection of invitations from the user in the redux store,
  // and add it to the collection of personal documents.
  try {
    thunkAPI.dispatch(removeOwned(owned));
    // Now we add the document, first to the redux store, then to the IndexedDB database
    let prefix = "data:application/xml;base64,";
    if (doc.type === "application/pdf") {
      prefix = "data:application/pdf;base64,";
    }
    let newDoc = {
      ...doc,
      state: "loaded",
      blob: prefix + contentData.payload.blob,
      pprinted: contentData.payload.pprinted,
    };
    delete newDoc.pending;
    delete newDoc.signed;
    delete newDoc.declined;
    newDoc = await addDocumentToDb(newDoc, state.main.signer_attributes.eppn);
    thunkAPI.dispatch(addDocument(newDoc));
  } catch (err) {
    // in case of errors, inform the user, and update the local state.
    const message = intl.formatMessage({
      defaultMessage: "Problem restoring document, please load it again",
      id: "problem-restoring-document",
    });
    thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
    thunkAPI.dispatch(rmDocument(doc.name));
    if (doc.id !== undefined) {
      await dbRemoveDocument(doc);
    }
  }
};

/**
 * @public
 * @function editInvitesPending
 * @desc async function to edit an invitation to sign a document if after
 *      the edition there are pending invitation left,
 *      or if it has already been signed by some invitees.
 *      In both cases the document is kept in the backend.
 *
 * This is called from the editInvites async thunk
 */
const editInvitesPending = async (values, thunkAPI, intl) => {
  const documentKey = values.documentKey;
  const invitationText = values.invitationText;
  const sendsigned = values.sendsignedChoice;
  const skipfinal = values.skipfinalChoice;
  const invitees = values.invitees.map((invitee) => ({
    name: invitee.name,
    email: invitee.email,
    lang: invitee.lang,
  }));

  let state = thunkAPI.getState();

  // We send the gathered data to the `edit-multi-sign` endpoint in the backend.
  const dataToSend = {
    key: documentKey,
    text: invitationText,
    sendsigned: sendsigned,
    skipfinal: skipfinal,
    invites: invitees,
  };
  const body = preparePayload(state, dataToSend);
  let data = null;
  try {
    const response = await esFetch("/sign/edit-multi-sign", {
      ...postRequest,
      body: body,
    });
    if (response.status === 502) {
      // Backend side worker timeout,
      throw new Error("502 when trying to send invitations");
    }
    data = await checkStatus(response);
    extractCsrfToken(thunkAPI.dispatch, data);
    if (data.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    // In case of errors, inform the user, update the app state.
    const message = intl.formatMessage({
      defaultMessage: "Problem editing invitation to sign, please try again",
      id: "problem-editing-invitation",
    });
    thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
    return thunkAPI.rejectWithValue(null);
  }
  // If there are no errors, update the pending key in the concerned document
  const newOwned = {
    key: documentKey,
    pending: values.invitees,
  };
  if (invitees.length === 0) {
    newOwned.state = "loaded";
  } else {
    newOwned.state = "incomplete";
  }
  thunkAPI.dispatch(updateOwned(newOwned));
};

/**
 * @public
 * @function removeInvites
 * @desc Redux async thunk to remove invitations to sign.
 */
export const removeInvites = createAsyncThunk(
  "main/removeInvites",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();

    // Get data on the document whose invitation we want to remove,
    // and send it to the `remove-multi-sign` backend endpoint.
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
      const response = await esFetch("/sign/remove-multi-sign", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      // in case of errors, inform the user, and update the local state.
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
    // If the request to the backend is successful, remove the representation
    // of the document from the collection of invitations from the user in the redux store,
    // and inform the user.
    thunkAPI.dispatch(removeOwned(owned));
    const message = args.intl.formatMessage({
      defaultMessage: "Success removing multi sign request",
      id: "success-removing-multisign",
    });
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  },
);

/**
 * @public
 * @function resendInvitations
 * @desc Redux async thunk to resend invitations to sign to pending users
 *
 * Triggered from the submit button in the form in ReInviteForm.
 */
export const resendInvitations = createAsyncThunk(
  "main/resendInvitations",
  async (args, thunkAPI) => {
    // First we gather the data to send to the backend,
    // and send it to the `send-multisign-reminder` endpoint.
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
      const response = await esFetch("/sign/send-multisign-reminder", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      // In case of errors, inform the user, and update the local state.
      const message = args.intl.formatMessage({
        defaultMessage: "Problem sending invitations to sign, please try again",
        id: "problem-sending-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return;
    }
    // If the response from the backend indicates a successful operation,
    // tell so to the user.
    const message = args.intl.formatMessage({
      defaultMessage: "Success resending invitations to sign",
      id: "success-sending-invitations",
    });
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  },
);
