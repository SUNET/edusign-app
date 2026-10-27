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
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { createIntl, IntlShape } from "react-intl";
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
import {
  loadDocuments,
  addDocumentToDb,
  addDocument,
  setState,
  createDocument,
} from "slices/Documents";
import { setInitialPolling } from "slices/Poll";
import { setAllowBankID } from "slices/InviteForm";
import { b64toBlob, nameForDownload } from "components/utils";
import { dbRemoveDocument } from "init-app/database";

/**
 * The slices this one talks to are still plain JS, so the values that cross
 * that boundary (documents, API payloads, the thunk API) are not typed here.
 */
type AnyDoc = Record<string, any>;

/** The two state keys holding multisign invitations. */
export type InvitationKey = "owned_multisign" | "pending_multisign";

export interface SignerAttributes {
  eppn: string;
  ssn: string;
  name: string;
  mail: string;
  mail_aliases: string[];
  assurance_levels: string[];
  authn_context: string;
  identity_provider: string;
  using_bankid: boolean;
  using_freja: boolean;
  invite_key: string;
}

export interface UiDefaults {
  skip_final: boolean;
  send_signed: boolean;
  ordered_invitations: boolean;
  allow_bankid?: boolean;
  sendsigned?: boolean;
}

export interface Loa {
  name: string;
  value: string;
}

export interface MainState {
  unauthn: boolean;
  loading: boolean;
  csrf_token: string | null;
  signer_attributes: SignerAttributes | null;
  owned_multisign: AnyDoc[];
  pending_multisign: AnyDoc[];
  signingData: Record<string, any>;
  size: "lg" | "sm";
  width: number;
  multisign_buttons: string;
  showHelp: boolean;
  max_file_size: number;
  max_signatures: number;
  company_link: string;
  available_loas: Loa[];
  ui_defaults: UiDefaults;
  environment: string;
  visibility_timer: number;
  fetch_timer: ReturnType<typeof setTimeout> | null;
  user_info_detail: string;
  stale_from: string;
  [key: string]: any;
}

const initialState: MainState = {
  unauthn: false,
  loading: true,
  csrf_token: null,
  signer_attributes: {
    eppn: "",
    ssn: "",
    name: "",
    mail: "",
    mail_aliases: [],
    assurance_levels: [],
    authn_context: "",
    identity_provider: "",
    using_bankid: false,
    using_freja: false,
    invite_key: "",
  },
  owned_multisign: [],
  pending_multisign: [],
  signingData: {},
  size: "lg",
  width: 0,
  multisign_buttons: "yes",
  showHelp: true,
  max_file_size: 20971520,
  max_signatures: 12,
  company_link: "https://sunet.se",
  available_loas: [],
  ui_defaults: {
    skip_final: false,
    send_signed: true,
    ordered_invitations: false,
  },
  environment: "production",
  visibility_timer: 0,
  fetch_timer: null,
  user_info_detail: "",
  stale_from: "none",
};

interface FetchConfigArgs {
  intl?: IntlShape;
  configPath?: string;
}

/**
 * @public
 * @function fetchConfig
 * @desc Redux async thunk to get configuration data from the backend.
 */
export const fetchConfig = createAsyncThunk(
  "main/fetchConfig",
  async (args: FetchConfigArgs | undefined, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const intl: IntlShape = args?.intl ?? createIntl(state.intl);
    const configPath: string = args?.configPath ?? "/sign/config";
    try {
      const response = await esFetch(
        configPath,
        getRequest,
        state,
        thunkAPI.dispatch,
      );
      const configData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, configData);
      thunkAPI.dispatch(mainSlice.actions.appLoaded());
      if (configData.error) {
        thunkAPI.dispatch(
          addNotification({ level: "danger", message: configData.message }),
        );
        return thunkAPI.rejectWithValue(configData.message);
      } else {
        const eppn = configData.payload.signer_attributes.eppn;
        thunkAPI.dispatch(setInitialPolling(configData.payload.poll));
        delete configData.payload.poll;

        const allowbankid = configData.payload.ui_defaults.allow_bankid;
        thunkAPI.dispatch(setAllowBankID(allowbankid));

        // The skipped docs are added to the IndexedDB db before dispatching
        // loadDocuments, so that its read finds them there.
        const skipped: AnyDoc[] = configData.payload.skipped.map(
          (doc: AnyDoc) => {
            let prefix = "data:application/xml;base64,";
            if (doc.type === "application/pdf") {
              prefix = "data:application/pdf;base64,";
            }
            return {
              ...doc,
              signedContent: prefix + doc.signed_content,
              blob: prefix + doc.signed_content,
              state: "signed",
              show: false,
              showForced: false,
            };
          },
        );
        const newDocs = await Promise.all(
          skipped.map((doc) => addDocumentToDb(doc, eppn)),
        );
        newDocs.forEach((newDoc) => {
          thunkAPI.dispatch(addDocument(newDoc));
        });

        delete configData.payload.skipped;

        thunkAPI.dispatch(
          loadDocuments({
            intl: intl,
            eppn: eppn,
          } as any),
        );

        return configData;
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: intl.formatMessage({
            defaultMessage: "Problem fetching configuration",
            id: "problem-fetching-configuration",
          }),
        }),
      );
      return thunkAPI.rejectWithValue(String(err));
    }
  },
);

interface GetPartiallySignedDocArgs {
  key: string;
  stateKey: InvitationKey;
  intl: IntlShape;
  show?: boolean;
  showForced?: boolean;
  retried?: boolean;
  payload?: AnyDoc;
}

/**
 * @public
 * @function getPartiallySignedDoc
 * @desc Redux async thunk to get from the backend a partially signed multisign doc
 */
export const getPartiallySignedDoc = createAsyncThunk(
  "main/getPartiallySignedDoc",
  async (args: GetPartiallySignedDocArgs, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const oldDocs = state.main[args.stateKey].filter((doc: AnyDoc) => {
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
      return args as any;
    }
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await esFetch(
        "/sign/get-partially-signed",
        {
          ...postRequest,
          body: body,
        },
        state,
        thunkAPI.dispatch,
      );
      const data = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, data);
      if (data.error) {
        if (args.retried === undefined) {
          const newArgs = {
            ...args,
            retried: true,
          };
          await thunkAPI.dispatch(getPartiallySignedDoc(newArgs));
          return { key: args.key, stateKey: args.stateKey } as any;
        } else {
          throw new Error(data.message);
        }
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
      return thunkAPI.rejectWithValue(String(err));
    }
  },
);

interface DeclineSigningArgs {
  key: string;
  intl: IntlShape;
}

/**
 * @public
 * @function declineSigning
 * @desc Redux async thunk to decline signing an invited document.
 */
export const declineSigning = createAsyncThunk(
  "main/declineSigning",
  async (args: DeclineSigningArgs, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const body = preparePayload(state, { key: args.key });
    try {
      const response = await esFetch(
        "/sign/decline-invitation",
        {
          ...postRequest,
          body: body,
        },
        state,
        thunkAPI.dispatch,
      );
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
      return thunkAPI.rejectWithValue(String(err));
    }
  },
);

interface DownloadDraftArgs {
  docKey: string;
  intl: IntlShape;
}

/**
 * @public
 * @function downloadInvitedDraft
 * @desc Redux async thunk to hand partially signed documents to the user.
 */
export const downloadInvitedDraft = createAsyncThunk(
  "main/downloadInvitedDraft",
  async (args: DownloadDraftArgs, thunkAPI) => {
    let state = thunkAPI.getState() as any;
    let doc = state.main.pending_multisign.find((d: AnyDoc) => {
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
    state = thunkAPI.getState() as any;
    doc = state.main.pending_multisign.find((d: AnyDoc) => {
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
 * @function downloadPersonalDraft
 * @desc Redux async thunk to hand partially signed documents to the user.
 */
export const downloadPersonalDraft = createAsyncThunk(
  "main/downloadPersonalDraft",
  (args: DownloadDraftArgs, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const doc = state.documents.documents.find((d: AnyDoc) => {
      return d.key === args.docKey;
    });
    const b64content =
      doc.signedContent !== undefined
        ? doc.signedContent.split(",")[1]
        : doc.blob.split(",")[1];
    const blob = b64toBlob(b64content, doc.type);
    FileSaver.saveAs(blob, doc.name);
  },
);

interface FinishInvitedArgs {
  doc: AnyDoc;
  intl: IntlShape;
}

/**
 * @public
 * @function finishInvited
 * @desc Redux action to finish an invited multisign request
 */
export const finishInvited = createAsyncThunk(
  "main/finishInvited",
  async (args: FinishInvitedArgs, thunkAPI) => {
    let state = thunkAPI.getState() as any;
    const oldDoc = state.main.pending_multisign.find(
      (doc: AnyDoc) => doc.key === args.doc.id,
    );
    if (oldDoc === undefined) {
      return;
    }
    if (
      state.main.signer_attributes.using_bankid ||
      state.main.signer_attributes.using_freja
    ) {
      const newDoc = {
        ...oldDoc,
        state: "signed",
      };
      thunkAPI.dispatch(setInvitedState(newDoc));
    } else {
      thunkAPI.dispatch(mainSlice.actions.removeInvited({ key: args.doc.id }));
      let prefix = "data:application/xml;base64,";
      if (args.doc.type === "application/pdf") {
        prefix = "data:application/pdf;base64,";
      }
      const content = prefix + args.doc.signed_content;
      let newDoc: AnyDoc = {
        ...oldDoc,
        name: nameForDownload(oldDoc.name, "draft", state),
        size: content.length,
        state: "loaded",
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
      delete newDoc.ordered;
      delete newDoc.validated;
      delete newDoc.invite_key;
      delete newDoc.owner;
      delete newDoc.message;
      delete newDoc.loa;
      delete newDoc.signed;
      delete newDoc.key;
      delete newDoc.id;

      newDoc.signed_draft = true;

      try {
        thunkAPI.dispatch(addDocument(newDoc));
        await thunkAPI.dispatch(
          createDocument({ doc: newDoc, intl: args.intl } as any),
        );
        state = thunkAPI.getState() as any;
        const preparedDoc = state.documents.documents.find(
          (doc: AnyDoc) => doc.name === newDoc.name,
        );
        if (preparedDoc === undefined) {
          throw new Error(`Document ${newDoc.name} could not be prepared`);
        }
        if (preparedDoc.state === "unconfirmed") {
          thunkAPI.dispatch(
            setState({
              name: newDoc.name,
              state: "loaded",
              signed_draft: true,
            }),
          );
        }
        state = thunkAPI.getState() as any;
        newDoc = state.documents.documents.find(
          (doc: AnyDoc) => doc.name === newDoc.name,
        );
        await dbRemoveDocument(newDoc);
        await addDocumentToDb(
          newDoc,
          state.main.signer_attributes.eppn,
          thunkAPI,
          args.intl,
        );
      } catch (err) {
        console.error("Problem saving draft of signed invitation", err);
        thunkAPI.dispatch(
          addNotification({
            level: "danger",
            message: args.intl.formatMessage({
              defaultMessage: "Problem saving draft of signed invitation.",
              id: "problem-saving-signed-draft",
            }),
          }),
        );
      }
    }
  },
);

interface DelegateSignatureArgs {
  values: {
    inviteKey: string;
    documentKey: string;
    delegationName: string;
    delegationEmail: string;
  };
  intl: IntlShape;
}

/**
 * @public
 * @function delegateSignature
 * @desc Redux async thunk to delegate signing a document to someone else.
 */
export const delegateSignature = createAsyncThunk(
  "main/delegateSignature",
  async (args: DelegateSignatureArgs, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const body = preparePayload(state, {
      invite_key: args.values.inviteKey,
      document_key: args.values.documentKey,
      name: args.values.delegationName,
      email: args.values.delegationEmail,
    });
    try {
      const response = await esFetch(
        "/sign/delegate-invitation",
        {
          ...postRequest,
          body: body,
        },
        state,
        thunkAPI.dispatch,
      );
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
      return thunkAPI.rejectWithValue(String(err));
    }
  },
);

const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    /**
     * @public
     * @function appLoading
     * @desc Redux action to set the loading key to true to indicate that the app is loading.
     */
    appLoading(state) {
      state.loading = true;
    },
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
    setCsrfToken(state, action: PayloadAction<string>) {
      state.csrf_token = action.payload;
    },
    /**
     * @public
     * @function updateSigningForm
     * @desc Redux action to pass input values to the signing form
     */
    updateSigningForm(state, action: PayloadAction<Record<string, any>>) {
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
    addOwned(state, action: PayloadAction<AnyDoc>) {
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
    removeOwned(state, action: PayloadAction<{ key: string }>) {
      state.owned_multisign = state.owned_multisign.filter((doc) => {
        return doc.key !== action.payload.key;
      });
    },
    /**
     * @public
     * @function removeInvited
     * @desc Redux action to remove an invited multisign request
     */
    removeInvited(state, action: PayloadAction<{ key: string }>) {
      state.pending_multisign = state.pending_multisign.filter((doc) => {
        return doc.key !== action.payload.key;
      });
    },
    /**
     * @public
     * @function updateOwned
     * @desc Redux action to update an owned multisign request
     */
    updateOwned(state, action: PayloadAction<AnyDoc>) {
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
    selectOwnedDoc(state, action: PayloadAction<string>) {
      state.owned_multisign = state.owned_multisign.map((doc) => {
        if (doc.key === action.payload) {
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
    selectInvitedDoc(state, action: PayloadAction<string>) {
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
    setInvitedSigning(state, action: PayloadAction<string>) {
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
    setOwnedSigning(state, action: PayloadAction<string>) {
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
    hideInvitedPreview(state, action: PayloadAction<string>) {
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
    hideOwnedPreview(state, action: PayloadAction<string>) {
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
    startSigningInvited(state, action: PayloadAction<string>) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
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
    startSigningOwned(state, action: PayloadAction<string>) {
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
    setInvitedState(state, action: PayloadAction<AnyDoc>) {
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
    setOwnedState(state, action: PayloadAction<AnyDoc>) {
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
    showForcedInvitedPreview(state, action: PayloadAction<string>) {
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
    hideForcedInvitedPreview(state, action: PayloadAction<string>) {
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
    confirmForcedInvitedPreview(state, action: PayloadAction<string>) {
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
    updateInvitations(
      state,
      action: PayloadAction<{ owned: AnyDoc[]; invited: AnyDoc[] }>,
    ) {
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
    updateInvitationsFailed(state, action: PayloadAction<{ message: string }>) {
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
    invitationsSignFailure(state, action: PayloadAction<string>) {
      const keys: InvitationKey[] = ["pending_multisign", "owned_multisign"];
      keys.forEach((key) => {
        state[key] = state[key].map((doc: AnyDoc) => {
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
    enableContextualHelp(state, action: PayloadAction<boolean>) {
      state.showHelp = action.payload;
    },
    /**
     * @public
     * @function setOwnedDocs
     * @desc Redux action to set the owned_multisign key
     */
    setOwnedDocs(state, action: PayloadAction<AnyDoc[]>) {
      state.owned_multisign = action.payload;
    },
    /**
     * @public
     * @function setInvitedDocs
     * @desc Redux action to set the pending_multisign key
     */
    setInvitedDocs(state, action: PayloadAction<AnyDoc[]>) {
      state.pending_multisign = action.payload;
    },
    /**
     * @public
     * @function startDelegating
     * @desc Redux action to open a delegation form
     */
    startDelegating(state, action: PayloadAction<string>) {
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
    stopDelegating(state, action: PayloadAction<string>) {
      state.pending_multisign = state.pending_multisign.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            delegating: false,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function setVisibilityTimer
     * @desc Redux action to set the visibility timer
     *       to avoid reloading the page too often
     */
    setVisibilityTimer(state, action: PayloadAction<number>) {
      return {
        ...state,
        visibility_timer: action.payload,
      };
    },
    /**
     * @public
     * @function setFetchTimer
     * @desc Redux action to set the fetch timer
     *       to avoid reloading the page too often
     */
    setFetchTimer(
      state,
      action: PayloadAction<ReturnType<typeof setTimeout> | null>,
    ) {
      if (state.fetch_timer !== null) {
        clearTimeout(state.fetch_timer);
      }
      return {
        ...state,
        fetch_timer: action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.fulfilled, (state, action: PayloadAction<any>) => {
        return {
          ...state,
          ...action.payload.payload,
        };
      })
      .addCase(fetchConfig.rejected, (state) => {
        return {
          ...state,
          signer_attributes: null,
        };
      })
      .addCase(
        getPartiallySignedDoc.fulfilled,
        (state, action: PayloadAction<any>) => {
          const stateKey = action.payload.stateKey as InvitationKey;
          state[stateKey] = state[stateKey].map((doc: AnyDoc) => {
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
          });
        },
      )
      .addCase(
        declineSigning.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.pending_multisign = state.pending_multisign.map((doc) => {
            if (doc.key === action.payload.key) {
              return {
                ...doc,
                state: "declined",
                message: action.payload.message,
              };
            } else return doc;
          });
        },
      )
      .addCase(
        delegateSignature.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.pending_multisign = state.pending_multisign.filter((doc) => {
            return doc.key !== action.payload.key;
          });
        },
      );
  },
});

export const {
  appLoading,
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
  setVisibilityTimer,
  setFetchTimer,
} = mainSlice.actions;

export default mainSlice.reducer;
