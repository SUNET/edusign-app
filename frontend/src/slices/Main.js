/**
 * @module slices/Main
 * @desc Here we define the initial state for the main key of the Redux state,
 * and the actions and reducers to manipulate it.
 *
 * The main key of the Redux state holds the following subkeys:
 *
 * - loading: to indicate whether the app is loading or has finished loading.
 *
 * Owned invitation states:
 * + incomplete: there are pending inveted signatures
 * + loaded: all invited have signed
 * + selected: invitation selected for signature
 * + signing: invitation is being signed
 * + signed: invitation has been signed
 * + failed-signing: invitation has had problems while being signed
 *
 * Invited invitation states:
 * + unconfirmed: the user has not previewed the document
 * + loaded: document has been previewed
 * + selected: invitation selected for signature
 * + signing: invitation is being signed
 * + failed-signing: invitation has had problems while being signed
 *
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createIntl } from "react-intl";
import * as FileSaver from "file-saver";

import {
  getRequest,
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
  esFetch,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { loadDocuments, addDocumentToDb, addDocument } from "slices/Documents";
import { setPolling, configureSkipped } from "slices/Poll";
import { b64toBlob, nameForDownload } from "components/utils";

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
 */
export const fetchConfig = createAsyncThunk(
  "main/fetchConfig",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    let intl;
    if (args === undefined) {
      intl = createIntl(state.intl);
    } else {
      intl = args.intl;
    }
    try {
      const response = await esFetch("/sign/config", getRequest);
      const configData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, configData);
      thunkAPI.dispatch(mainSlice.actions.appLoaded());
      if (configData.error) {
        thunkAPI.dispatch(
          addNotification({ level: "danger", message: configData.message }),
        );
        return thunkAPI.rejectWithValue(configData.message);
      } else {
        thunkAPI.dispatch(
          loadDocuments({
            intl: intl,
            eppn: configData.payload.signer_attributes.eppn,
          }),
        );
        thunkAPI.dispatch(setPolling(configData.payload.poll));
        delete configData.payload.poll;

        for (const doc of configData.payload.skipped) {
          let prefix = "data:application/xml;base64,";
          if (doc.type === "application/pdf") {
            prefix = "data:application/pdf;base64,";
          }
          doc.signedContent = prefix + doc.signed_content;
          doc.blob = prefix + doc.signed_content;
          doc.state = "signed";
          doc.show = false;
          doc.showForced = false;
          doc.pprinted = doc.pprinted;
          const newDoc = await addDocumentToDb(
            doc,
            state.main.signer_attributes.eppn,
          );
          thunkAPI.dispatch(addDocument(newDoc));
        }

        delete configData.payload.skipped;
        return configData;
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: intl.formatMessage({
            defaultMessage: "TODO",
            id: "main-todo",
          }),
        }),
      );
      return thunkAPI.rejectWithValue(err.toString());
    }
  },
);

/**
 * @public
 * @function getPartiallySignedDoc
 * @desc Redux async thunk to get from the backend a partially signed multisign doc
 */
export const getPartiallySignedDoc = createAsyncThunk(
  "main/getPartiallySignedDoc",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const oldDocs = state.main[args.stateKey].filter((doc) => {
      return doc.key === args.key;
    });
    if (oldDocs.length == 1 && oldDocs[0].blob) {
      args.payload = oldDocs[0];
      if (args.showForced) {
        args.payload = {
          ...args.payload,
          showForced: true,
        };
      } else if (args.show) {
        args.payload = {
          ...args.payload,
          show: true,
        };
      }
      return args;
    }
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await esFetch("/sign/get-partially-signed", {
        ...postRequest,
        body: body,
      });
      let data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }

      data.key = args.key;
      data.stateKey = args.stateKey;
      data.payload.showForced = args.showForced;
      data.payload.show = args.show;
      return data;
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage:
              "Problem fetching document from the backend, please try again",
            id: "problem-fetching-document",
          }),
        }),
      );
    }
  },
);

/**
 * @public
 * @function declineSigning
 * @desc Redux async thunk to decline signing an invited document.
 */
export const declineSigning = createAsyncThunk(
  "main/declineSigning",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await esFetch("/sign/decline-invitation", {
        ...postRequest,
        body: body,
      });
      let data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      return {
        key: args.key,
        message: args.intl.formatMessage({
          defaultMessage: "You have declined to sign this document.",
          id: "declining-document-signature",
        }),
      };
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem declining signature",
            id: "problem-declining-document",
          }),
        }),
      );
    }
  },
);

/**
 * @public
 * @function downloadInvitedDraft
 * @desc Redux async thunk to hand partially signed documents to the user.
 */
export const downloadInvitedDraft = createAsyncThunk(
  "main/downloadInvitedDraft",
  async (args, thunkAPI) => {
    let state = thunkAPI.getState();
    let doc = state.main.pending_multisign.find((d) => {
      return d.key === args.docKey;
    });
    if (!doc.signedContent) {
      await thunkAPI.dispatch(
        getPartiallySignedDoc({
          key: doc.key,
          stateKey: "pending_multisign",
          intl: args.intl,
          show: false,
          showForced: false,
        }),
      );
    }
    state = thunkAPI.getState();
    doc = state.main.pending_multisign.find((d) => {
      return d.key === args.docKey;
    });
    const b64content =
      doc.signedContent !== undefined
        ? doc.signedContent.split(",")[1]
        : doc.blob.split(",")[1];
    const blob = b64toBlob(b64content, doc.type);
    const newName = nameForDownload(doc.name, "draft", state);
    FileSaver.saveAs(blob, newName);
  },
);


/**
 * @public
 * @function finishInvited
 * @desc Redux action to finish an invited multisign request
 */
export const finishInvited = createAsyncThunk(
  "main/finishInvited",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const oldDoc = state.main.pending_multisign.find(doc => doc.key === args.doc.id);
    if (oldDoc === undefined) {
      return;
    }
    thunkAPI.dispatch(mainSlice.actions.removeInvited({key: args.doc.id}));
    let prefix = "data:application/xml;base64,";
    if (args.doc.type === "application/pdf") {
      prefix = "data:application/pdf;base64,";
    }
    const content = prefix + args.doc.signed_content;
    let newDoc = {
      ...oldDoc,
      name: nameForDownload(oldDoc.name, "draft", state),
      state: "signed",
      message: "",
      blob: content,
      signedContent: content,
      pprinted: args.doc.pprinted,
      validated: args.doc.validated,
      show: false,
      showForced: false,
      signed: args.doc.signed,
    };
    delete newDoc.pending;
    delete newDoc.declined;
    try {
      newDoc = await addDocumentToDb(newDoc, state.main.signer_attributes.eppn);
      thunkAPI.dispatch(addDocument(newDoc));
    } catch(err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "TODO",
            id: "main-todo",
          }),
        }),
      );
    }
  },
);

/**
 * @public
 * @function delegateSignature
 * @desc Redux async thunk to delegate signing a document to someone else.
 */
export const delegateSignature = createAsyncThunk(
  "main/delegateSignature",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const body = preparePayload(state, {
      invite_key: args.values.inviteKey,
      document_key: args.values.documentKey,
      name: args.values.delegationName,
      email: args.values.delegationEmail,
    });
    try {
      const response = await esFetch("/sign/delegate-invitation", {
        ...postRequest,
        body: body,
      });
      let data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        throw new Error(data.message);
      }
      if (data.message) {
        thunkAPI.dispatch(
          addNotification({
            level: "success",
            message: data.message,
          }),
        );
      }
      return { key: args.values.documentKey };
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem delegating signature",
            id: "problem-delegating-document",
          }),
        }),
      );
    }
  },
);

const mainSlice = createSlice({
  name: "main",
  initialState: {
    unauthn: false,
    loading: false,
    csrf_token: null,
    signer_attributes: {
      eppn: "",
      name: "",
      mail: "",
      mail_aliases: [],
    },
    owned_multisign: [],
    pending_multisign: [],
    signingData: {},
    size: "lg",
    width: 0,
    multisign_buttons: "yes",
    showHelp: true,
    max_file_size: 20971520,
    max_signatures: 10,
    company_link: "https://sunet.se",
    available_loas: [],
    ui_defaults: {
      skip_final: false,
      send_signed: true,
      ordered_invitations: false,
    },
    environment: 'production',
  },
  reducers: {
    /**
     * @public
     * @function appLoaded
     * @desc Redux action to set the loading key to false to indicate that the app has finished loading.
     */
    appLoaded(state) {
      state.loading = false;
    },
    /**
     * @public
     * @function setCsrfToken
     * @desc Redux action to keep the csrf token in the state
     */
    setCsrfToken(state, action) {
      state.csrf_token = action.payload;
    },
    /**
     * @public
     * @function updateSigningForm
     * @desc Redux action to pass input values to the signing form
     */
    updateSigningForm(state, action) {
      state.signingData = action.payload;
    },
    /**
     * @public
     * @function resizeWindow
     * @desc Redux action to set the window size in the state
     */
    resizeWindow(state) {
      state.size = window.innerWidth > 1200 ? "lg" : "sm";
      state.width = window.innerWidth;
    },
    /**
     * @public
     * @function addOwned
     * @desc Redux action to add an owned multisign request
     */
    addOwned(state, action) {
      let present = false;
      const doc = action.payload;
      state.owned_multisign.forEach((owned) => {
        if (owned.name === doc.name) present = true;
      });
      if (!present) {
        state.owned_multisign.push(doc);
      }
    },
    /**
     * @public
     * @function removeOwned
     * @desc Redux action to remove an owned multisign request
     */
    removeOwned(state, action) {
      state.owned_multisign = state.owned_multisign.filter((doc) => {
        return doc.key !== action.payload.key;
      });
    },
    /**
     * @public
     * @function removeInvited
     * @desc Redux action to remove an invited multisign request
     */
    removeInvited(state, action) {
      state.pending_multisign = state.pending_multisign.filter((doc) => {
        return doc.key !== action.payload.key;
      });
    },
    /**
     * @public
     * @function updateOwned
     * @desc Redux action to update an owned multisign request
     */
    updateOwned(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.key === action.payload.key) {
          return {
            ...doc,
            ...action.payload,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function selectOwnedDoc
     * @desc Redux action to select an owned invitation
     */
    selectOwnedDoc(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.name === action.payload) {
          const state = doc.state === "selected" ? "loaded" : "selected";
          return {
            ...doc,
            state: state,
            message: "",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function selectInvitedDoc
     * @desc Redux action to select an invited invitation
     */
    selectInvitedDoc(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
          const st = doc.state === "selected" ? "loaded" : "selected";
          return {
            ...doc,
            state: st,
            message: "",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setInvitedSigning
     * @desc Redux action to mark and invitee doc as being signed
     */
    setInvitedSigning(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.invite_key === action.payload) {
          return {
            ...doc,
            state: "signing",
            message: "",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setOwnedSigning
     * @desc Redux action to mark and invited doc as being signed
     */
    setOwnedSigning(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            state: "signing",
            message: "",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideInvitedPreview
     * @desc Redux action to hide the previewed document
     */
    hideInvitedPreview(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
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
     * @function hideOwnedPreview
     * @desc Redux action to hide the owned previewed document
     */
    hideOwnedPreview(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            show: false,
          };
        } else return doc;
      });
    },
    /**
     * @function startSigningInvited
     * @desc Redux action to update a document in the store
     * setting the state key to "signing"
     */
    startSigningInvited(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.name === action.payload) {
          const document = {
            ...doc,
            state: "signing",
            message: "",
          };
          return document;
        } else return doc;
      });
    },
    /**
     * @public
     * @function startSigningOwned
     * @desc Redux action to update a document in the store
     * setting the state key to "signing"
     */
    startSigningOwned(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.name === action.payload) {
          const document = {
            ...doc,
            state: "signing",
            message: "",
          };
          return document;
        } else return doc;
      });
    },
    /**
     * @function setInvitedState
     * @desc Redux action to update a document in the store
     * setting the state key to whatever
     */
    setInvitedState(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload.key) {
          const newDoc = {
            ...doc,
            ...action.payload,
          };
          return newDoc;
        } else return doc;
      });
    },
    /**
     * @public
     * @function setOwnedState
     * @desc Redux action to update a document in the store
     * setting the state key to whatever
     */
    setOwnedState(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.name === action.payload.name) {
          const document = {
            ...doc,
            ...action.payload,
          };
          return document;
        } else return doc;
      });
    },
    /**
     * @public
     * @function showForcedInvitedPreview
     * @desc Redux action to update an invited document in the documents state key,
     * setting the show key to true (so that the UI will show the forced preview of the document).
     */
    showForcedInvitedPreview(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            showForced: true,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideForcedInvitedPreview
     * @desc Redux action to update an invited document in the documents state key,
     * setting the showForced key to false (so that the UI will hide the forced preview of the document).
     */
    hideForcedInvitedPreview(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
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
     * @function confirmForcedInvitedPreview
     * @desc Redux action to update an invited document in the documents state key,
     * setting the showForced key to false (so that the UI will hide the forced preview of the document,
     * and the document will end in the 'selected' state).
     */
    confirmForcedInvitedPreview(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            showForced: false,
            state: "selected",
            message: "",
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function updateInvitations
     * @desc Redux action to update owned and invited documents,
     * after having signed some at the IdP,
     * with data kept in localStorage while we were away at the IdP.
     */
    updateInvitations(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.state !== "signed") {
          action.payload.owned.forEach((storedDoc) => {
            if (doc.key === storedDoc.key) {
              doc = {
                ...doc,
                ...storedDoc,
                message: "",
              };
            }
          });
        }
        return doc;
      });
      state.pending_multisign = state.pending_multisign.map((doc) => {
        action.payload.invited.forEach((storedDoc) => {
          if (doc.key === storedDoc.key) {
            doc = {
              ...doc,
              ...storedDoc,
              message: "",
            };
          }
        });
        return doc;
      });
    },
    /**
     * @public
     * @function updateInvitationsFailed
     * @desc Redux action to update owned and invited documents,
     * after having interrumped signature at the IdP,
     * with failed-signing state
     */
    updateInvitationsFailed(state, action) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.state === "signing") {
          doc.state = "failed-signing";
          doc.message = action.payload.message;
        }
        return doc;
      });
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.state === "signing") {
          doc.state = "failed-signing";
          doc.message = action.payload.message;
        }
        return doc;
      });
    },
    /**
     * @public
     * @function invitationsSignFailure
     * @desc Redux action to update owned and invited documents,
     * after encountering a general problem while trying to create a sign request
     */
    invitationsSignFailure(state, action) {
      ["pending_multisign", "owned_multisign"].forEach((key) => {
        state[key] = state[key].map((doc) => {
          if (doc.state === "signing") {
            doc.state = "failed-signing";
            doc.message = action.payload;
          }
          return doc;
        });
      });
    },
    /**
     * @public
     * @function enableContextualHelp
     * @desc Redux action to enable / disable contextual help
     */
    enableContextualHelp(state, action) {
      state.showHelp = action.payload;
    },
    /**
     * @public
     * @function setOwnedDocs
     * @desc Redux action to set the owned_multisign key
     */
    setOwnedDocs(state, action) {
      state.owned_multisign = action.payload;
    },
    /**
     * @public
     * @function setInvitedDocs
     * @desc Redux action to set the pending_multisign key
     */
    setInvitedDocs(state, action) {
      state.pending_multisign = action.payload;
    },
    /**
     * @public
     * @function startDelegating
     * @desc Redux action to open a delegation form
     */
    startDelegating(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            delegating: true,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function stopDelegating
     * @desc Redux action to close a delegation form
     */
    stopDelegating(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            delegating: false,
          };
        } else return doc;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.fulfilled, (state, action) => {
        return {
          ...state,
          ...action.payload.payload,
        };
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        return {
          ...state,
          signer_attributes: null,
        };
      })
      .addCase(getPartiallySignedDoc.fulfilled, (state, action) => {
        state[action.payload.stateKey] = state[action.payload.stateKey].map(
          (doc) => {
            if (doc.key === action.payload.key) {
              let newDoc = { ...doc };
              if (action.payload.payload) {
                newDoc = {
                  ...doc,
                  ...action.payload.payload,
                };
                if (!newDoc.blob.startsWith("data:")) {
                  let prefix = "data:application/xml;base64,";
                  if (newDoc.type === "application/pdf") {
                    prefix = "data:application/pdf;base64,";
                  }
                  newDoc.blob = prefix + action.payload.payload.blob;
                }
                newDoc.pprinted = action.payload.payload.pprinted;
              }
              return newDoc;
            } else return doc;
          },
        );
      })
      .addCase(declineSigning.fulfilled, (state, action) => {
        state.pending_multisign = state.pending_multisign.map((doc) => {
          if (doc.key === action.payload.key) {
            return {
              ...doc,
              state: "declined",
              message: action.payload.message,
            };
          } else return doc;
        });
      })
      .addCase(delegateSignature.fulfilled, (state, action) => {
        state.pending_multisign = state.pending_multisign.filter((doc) => {
          return doc.key !== action.payload.key;
        });
      });
  },
});

export const {
  appLoaded,
  setCsrfToken,
  updateSigningForm,
  resizeWindow,
  addOwned,
  removeOwned,
  removeInvited,
  updateOwned,
  setInvitedSigning,
  setOwnedSigning,
  hideInvitedPreview,
  hideOwnedPreview,
  startSigningInvited,
  startSigningOwned,
  setInvitedState,
  setOwnedState,
  selectInvitedDoc,
  selectOwnedDoc,
  showForcedInvitedPreview,
  hideForcedInvitedPreview,
  confirmForcedInvitedPreview,
  updateInvitations,
  invitationsSignFailure,
  updateInvitationsFailed,
  enableContextualHelp,
  setInvitedDocs,
  setOwnedDocs,
  startDelegating,
  stopDelegating,
} = mainSlice.actions;

export default mainSlice.reducer;
