import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { addOwned, removeOwned, updateOwned } from "slices/Main";
import {
  createDocument,
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
    const documentId = args.values.documentId;
    const invitees = args.values.invitees;
    const isTemplate = args.values.isTemplate;

    let state = thunkAPI.getState();

    let document;
    if (isTemplate) {
      document = state.template.documents.filter((doc) => {
        return doc.id === documentId;
      })[0];
    } else {
      document = state.documents.documents.filter((doc) => {
        return doc.id === documentId;
      })[0];
    }

    const owner = state.main.signer_attributes.mail;

    if (document.state === 'signed') {
      document = {...document};
      await thunkAPI.dispatch(removeDocument({ docName: document.name }));
      await thunkAPI.dispatch(createDocument({ doc: document, intl: args.intl }));
      state = thunkAPI.getState();
      document = state.documents.documents.filter((doc) => {
        return doc.name === document.name;
      })[0];
    }

    if (state.inviteform.make_copy || isTemplate) {
      // If we want to create the invitation on a copy of the document,
      // keeping the original unsigned as a template,
      // we create the copy here.
      const docName = args.values.newnameInput;
      const newDoc = {
        name: docName,
        blob: document.blob,
        size: document.size,
        type: document.type,
      };
      await thunkAPI.dispatch(createDocument({ doc: newDoc, intl: args.intl }));

      // The previously gotten state is out of date by now
      state = thunkAPI.getState();
      const newDocument = state.documents.documents.filter((doc) => {
        return doc.name === docName;
      })[0];
      thunkAPI.dispatch(setState({ name: docName, state: "loaded" }));
      if (!isTemplate) {
        thunkAPI.dispatch(rmDocument(document.name));
        if (document.id !== undefined) {
          await dbRemoveDocument(document);
        }
        const newTemplate = {
          ...document,
          state: "loaded",
          isTemplate: true,
        };
        await saveTemplate(thunkAPI, newTemplate);
      }
      document = newDocument;
    }
    // We send the gathered data to the `create-multi-sign` endpoint in the backend.
    const dataToSend = {
      owner: owner,
      invites: invitees,
      text: args.values.invitationText,
      sendsigned: args.values.sendsignedChoice,
      loa:
        args.values.loa.join !== undefined ? args.values.loa.join(";") : "none",
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
      // In case of errors, inform the user, update the app state.
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
    // If there are no errors, remove the original document from the collection (in the redux state)
    // of non-invitation documents, and add it to the collection of documents invited by the user.
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

    // Start polling the backend, to update the local state when users invited to sign do sign.
    thunkAPI.dispatch(setPolling(true));
    thunkAPI.dispatch(rmDocumentByKey(document.key));
  }
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
    const documentKey = args.values.documentKey;
    const invitees = args.values.invitees;

    let state = thunkAPI.getState();

    const owner = state.main.signer_attributes.mail;

    // We send the gathered data to the `edit-multi-sign` endpoint in the backend.
    const dataToSend = {
      owner: owner,
      key: documentKey,
      invites: invitees,
    };
    const body = preparePayload(state, dataToSend);
    let data = null;
    try {
      const response = await fetch("/sign/edit-multi-sign", {
        ...postRequest,
        body: body,
      });
      if (response.status === 502) {
        // Backend side worker timeout,
        throw new Error("502 when trying to send invitations");
      }
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      // In case of errors, inform the user, update the app state.
      const message = args.intl.formatMessage({
        defaultMessage: "Problem editing invitations to sign, please try again",
        id: "problem-editing-invitations",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return thunkAPI.rejectWithValue(null);
    }
    if (data.error) {
      const message = args.intl.formatMessage({
        defaultMessage: "Problem editing invitation to sign, please try again",
        id: "problem-editing-multisign",
      });
      thunkAPI.dispatch(addNotification({ level: "danger", message: message }));
      return thunkAPI.rejectWithValue(null);
    }
    // If there are no errors, update the pending key in the concerned document
    thunkAPI.dispatch(updateOwned({ key: documentKey, pending: invitees }));
  }
);

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
      const response = await fetch("/sign/remove-multi-sign", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      // in case of errors, inform the user, and update the local state.
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
  }
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
      const response = await fetch("/sign/send-multisign-reminder", {
        ...postRequest,
        body: body,
      });
      data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
    } catch (err) {
      // In case of errors, inform the user, and update the local state.
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

    // If the response from the backend indicates a successful operation,
    // tell so to the user.
    const message = args.intl.formatMessage({
      defaultMessage: "Success resending invitations to sign",
      id: "success-sending-invitations",
    });
    thunkAPI.dispatch(addNotification({ level: "success", message: message }));
    return document.key;
  }
);
