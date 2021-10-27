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

import {
  getRequest,
  postRequest,
  checkStatus,
  extractCsrfToken,
  preparePayload,
} from "slices/fetch-utils";
import { addNotification } from "slices/Notifications";
import { loadDocuments } from "slices/Documents";

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
 */
export const fetchConfig = createAsyncThunk(
  "main/fetchConfig",
  async (args, thunkAPI) => {
    let intl;
    if (args === undefined) {
      const state = thunkAPI.getState();
      intl = createIntl(state.intl);
    } else {
      intl = args.intl;
    }
    try {
      const response = await fetch("/sign/config", getRequest);
      const configData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, configData);
      thunkAPI.dispatch(mainSlice.actions.appLoaded());
      if (configData.error) {
        thunkAPI.dispatch(
          addNotification({ level: "danger", message: configData.message })
        );
        return thunkAPI.rejectWithValue(configData.message);
      } else {
        thunkAPI.dispatch(
          loadDocuments({
            intl: intl,
            eppn: configData.payload.signer_attributes.eppn,
          })
        );
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
        })
      );
      return thunkAPI.rejectWithValue(err.toString());
    }
  }
);

/**
 * @public
 * @function poll
 * @desc Redux async thunk to poll configuration data from the backend.
 */
export const poll = createAsyncThunk("main/poll", async (args, thunkAPI) => {
  const state = thunkAPI.getState();
  if (state.main.disablePoll) {
    return thunkAPI.rejectWithValue("Polling disabled");
  }
  try {
    const response = await fetch("/sign/poll", getRequest);
    const configData = await checkStatus(response);
    extractCsrfToken(thunkAPI.dispatch, configData);
    if (configData.error) {
      return thunkAPI.rejectWithValue(configData.message);
    } else {
      const allOwned = state.main.owned_multisign.map((owned) => {
        if (owned.pending.length > 0) {
          const ownedCopy = { ...owned };
          configData.payload.owned_multisign.forEach((newOwned) => {
            if (ownedCopy.name === newOwned.name) {
              ownedCopy.pending = newOwned.pending;
              ownedCopy.signed = newOwned.signed;
              ownedCopy.declined = newOwned.declined;
            }
          });
          if (ownedCopy.pending.length === 0) ownedCopy.state = "loaded";
          return ownedCopy;
        }
        return owned;
      });
      configData.payload.owned_multisign = allOwned;

      const allInvited = state.main.pending_multisign.map((invited) => {
        const invitedCopy = { ...invited };
        configData.payload.pending_multisign.forEach((newInvited) => {
          if (invitedCopy.name === newInvited.name) {
            invitedCopy.pending = newInvited.pending;
            invitedCopy.signed = newInvited.signed;
            invitedCopy.declined = newInvited.declined;
          }
        });
        return invitedCopy;
      });
      configData.payload.pending_multisign = allInvited;

      return configData;
    }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.toString());
  }
});

/**
 * @public
 * @function getPartiallySignedDoc
 * @desc Redux async thunk to get from the backend a partially signed multisign doc
 */
export const getPartiallySignedDoc = createAsyncThunk(
  "documents/getPartiallySignedDoc",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const oldDocs = state.main[args.stateKey].filter((doc) => {
      doc.key === args.key;
    });
    if (oldDocs.length == 1 && oldDocs[0].blob) {
      args.payload = oldDocs[0];
      if (args.hasOwnProperty("showForced")) {
        args.payload.showForced = true;
      } else {
        args.payload.show = true;
      }
      return args;
    }
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await fetch("/sign/get-partially-signed", {
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
      if (args.hasOwnProperty("showForced")) {
        data.payload.showForced = true;
      } else {
        data.payload.show = true;
      }
      return data;
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem fetching document from the backend ",
            id: "problem-fetching-document",
          }),
        })
      );
    }
  }
);

/**
 * @public
 * @function declineSigning
 * @desc Redux async thunk to decline signing an invited document.
 */
export const declineSigning = createAsyncThunk(
  "documents/declineSigning",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await fetch("/sign/decline-invitation", {
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
        })};
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem declining signature",
            id: "problem-declining-document",
          }),
        })
      );
    }
  }
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
    },
    owned_multisign: [],
    pending_multisign: [],
    signingData: {},
    size: "lg",
    width: 0,
    multisign_buttons: "yes",
    poll: false,
    disablePoll: false,
    showHelp: true,
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
      state.owned_multisign.push(action.payload);
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
     * @function finishInvited
     * @desc Redux action to finish an invited multisign request
     */
    finishInvited(state, action) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload.key) {
          return {
            ...doc,
            state: 'signed',
            message: '',
          };
        }
        return doc;
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
            message: '',
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
        if (doc.name === action.payload) {
          const st = doc.state === "selected" ? "loaded" : "selected";
          return {
            ...doc,
            state: st,
            message: '',
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
            message: '',
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
            message: '',
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
     * @public
     * @function setPolling
     * @desc Redux action to set the polling state
     */
    setPolling(state, action) {
      state.poll = action.payload;
    },
    /**
     * @public
     * @function enablePolling
     * @desc Redux action to enable polling
     */
    enablePolling(state, action) {
      state.disablePoll = false;
      state.poll = true;
    },
    /**
     * @public
     * @function disablePolling
     * @desc Redux action to disable polling
     */
    disablePolling(state, action) {
      state.disablePoll = true;
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
            message: '',
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
            message: '',
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
        if (doc.name === action.payload) {
          return {
            ...doc,
            showForced: false,
            state: "selected",
            message: '',
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
        if (doc.state !== 'signed') {
          action.payload.owned.forEach((storedDoc) => {
            if (doc.key === storedDoc.key) {
              doc = {
                ...doc,
                ...storedDoc,
                message: '',
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
              message: '',
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
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.state === "signing") {
          doc.state = "failed-signing";
          doc.message = action.payload;
        }
        return doc;
      });
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.state === "signing") {
          doc.state = "failed-signing";
          doc.message = action.payload;
        }
        return doc;
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
  },
  extraReducers: {
    [fetchConfig.fulfilled]: (state, action) => {
      return {
        ...state,
        ...action.payload.payload,
      };
    },
    [fetchConfig.rejected]: (state, action) => {
      return {
        ...state,
        signer_attributes: null,
      };
    },
    [poll.fulfilled]: (state, action) => {
      return {
        ...state,
        ...action.payload.payload,
      };
    },
    [getPartiallySignedDoc.fulfilled]: (state, action) => {
      state[action.payload.stateKey] = state[action.payload.stateKey].map(
        (doc) => {
          if (doc.key === action.payload.key) {
            let newDoc = { ...doc };
            if (action.payload.payload) {
              newDoc = {
                ...doc,
                ...action.payload.payload,
              };
              newDoc.blob =
                "data:application/pdf;base64," + action.payload.payload.blob;
            }
            return newDoc;
          } else return doc;
        }
      );
    },
    [declineSigning.fulfilled]: (state, action) => {
      state.pending_multisign = state.pending_multisign.map(
        (doc) => {
          if (doc.key === action.payload.key) {
            return {
              ...doc,
              state: 'declined',
              message: action.payload.message,
            };
          } else return doc;
        }
      );
    },
  },
});

export const {
  appLoaded,
  setCsrfToken,
  updateSigningForm,
  resizeWindow,
  addOwned,
  removeOwned,
  updateOwned,
  finishInvited,
  setInvitedSigning,
  setOwnedSigning,
  hideInvitedPreview,
  hideOwnedPreview,
  setPolling,
  enablePolling,
  disablePolling,
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
} = mainSlice.actions;

export default mainSlice.reducer;
