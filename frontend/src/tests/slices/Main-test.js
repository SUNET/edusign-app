import fetchMock from "fetch-mock";
import { saveAs } from "file-saver";
import { updateIntl } from "react-intl-redux";

// spying on the file-saver namespace does not reach the copy that
// slices/Main.js imports (babel interop makes one per importer), so the
// whole module is mocked
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));

import { edusignStore } from "init-app/init-app";
import { resetDb } from "init-app/database";
import { b64SamplePDFData } from "tests/test-utils";
import {
  fetchConfig,
  getPartiallySignedDoc,
  declineSigning,
  downloadInvitedDraft,
  downloadPersonalDraft,
  finishInvited,
  delegateSignature,
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
} from "slices/Main";
import { addDocument } from "slices/Documents";

// getPartiallySignedDoc puts its whole args object, intl included, into the
// fulfilled action; an enumerable formatMessage function would make RTK's
// dev-mode serializability check print an error for every such dispatch.
const intl = {};
Object.defineProperty(intl, "formatMessage", {
  value: ({ defaultMessage }) => defaultMessage,
});

const mkStore = () => {
  const store = edusignStore();
  store.dispatch(updateIntl({ locale: "en", messages: {} }));
  return store;
};

// let pending microtasks and IndexedDB callbacks settle
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const configPayload = (overrides = {}) => ({
  payload: {
    unauthn: false,
    poll: false,
    multisign_buttons: "true",
    signer_attributes: {
      name: "Tester Testig",
      eppn: "tester@example.org",
      mail: "tester@example.org",
      mail_aliases: ["tester@example.org"],
    },
    owned_multisign: [],
    pending_multisign: [],
    skipped: [],
    ui_defaults: { send_signed: true, skip_final: true, allow_bankid: true },
    available_loas: [],
    ...overrides,
  },
});

const setWindowWidth = (width) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe("Main slice plain reducers", () => {
  it("appLoading and appLoaded toggle the loading flag", () => {
    const store = mkStore();
    expect(store.getState().main.loading).toEqual(true);
    store.dispatch(appLoaded());
    expect(store.getState().main.loading).toEqual(false);
    store.dispatch(appLoading());
    expect(store.getState().main.loading).toEqual(true);
  });

  it("setCsrfToken keeps the token", () => {
    const store = mkStore();
    store.dispatch(setCsrfToken("dummy-token"));
    expect(store.getState().main.csrf_token).toEqual("dummy-token");
  });

  it("updateSigningForm keeps the form data", () => {
    const store = mkStore();
    store.dispatch(updateSigningForm({ relay_state: "rs" }));
    expect(store.getState().main.signingData).toEqual({ relay_state: "rs" });
  });

  it("resizeWindow sets size by breakpoint at 1200", () => {
    const store = mkStore();
    setWindowWidth(1300);
    store.dispatch(resizeWindow());
    expect(store.getState().main.size).toEqual("lg");
    expect(store.getState().main.width).toEqual(1300);
    setWindowWidth(800);
    store.dispatch(resizeWindow());
    expect(store.getState().main.size).toEqual("sm");
    expect(store.getState().main.width).toEqual(800);
  });

  it("addOwned adds a doc once, by name", () => {
    const store = mkStore();
    store.dispatch(addOwned({ name: "a.pdf", key: "k1" }));
    store.dispatch(addOwned({ name: "a.pdf", key: "k2" }));
    expect(store.getState().main.owned_multisign).toEqual([
      { name: "a.pdf", key: "k1" },
    ]);
  });

  it("removeOwned removes by key", () => {
    const store = mkStore();
    store.dispatch(setOwnedDocs([{ name: "a.pdf", key: "k1" }]));
    store.dispatch(removeOwned({ key: "k1" }));
    expect(store.getState().main.owned_multisign).toEqual([]);
  });

  it("removeInvited removes by key", () => {
    const store = mkStore();
    store.dispatch(setInvitedDocs([{ name: "a.pdf", key: "k1" }]));
    store.dispatch(removeInvited({ key: "k1" }));
    expect(store.getState().main.pending_multisign).toEqual([]);
  });

  it("updateOwned merges payload into the doc with the same key", () => {
    const store = mkStore();
    store.dispatch(
      setOwnedDocs([
        { name: "a.pdf", key: "k1", state: "loaded" },
        { name: "b.pdf", key: "k2", state: "loaded" },
      ]),
    );
    store.dispatch(updateOwned({ key: "k1", state: "signed" }));
    const owned = store.getState().main.owned_multisign;
    expect(owned[0].state).toEqual("signed");
    expect(owned[1].state).toEqual("loaded");
  });

  it("selectOwnedDoc toggles between selected and loaded", () => {
    const store = mkStore();
    store.dispatch(setOwnedDocs([{ name: "a.pdf", key: "k1", state: "loaded" }]));
    store.dispatch(selectOwnedDoc("k1"));
    expect(store.getState().main.owned_multisign[0].state).toEqual("selected");
    store.dispatch(selectOwnedDoc("k1"));
    expect(store.getState().main.owned_multisign[0].state).toEqual("loaded");
  });

  it("selectInvitedDoc toggles between selected and loaded", () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "a.pdf", key: "k1", state: "loaded" }]),
    );
    store.dispatch(selectInvitedDoc("k1"));
    expect(store.getState().main.pending_multisign[0].state).toEqual(
      "selected",
    );
    store.dispatch(selectInvitedDoc("k1"));
    expect(store.getState().main.pending_multisign[0].state).toEqual("loaded");
  });

  it("setInvitedSigning marks the doc signing, by invite_key", () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([
        { name: "a.pdf", key: "k1", invite_key: "ik1", state: "selected" },
      ]),
    );
    store.dispatch(setInvitedSigning("ik1"));
    expect(store.getState().main.pending_multisign[0].state).toEqual("signing");
  });

  it("setOwnedSigning marks the doc signing, by key", () => {
    const store = mkStore();
    store.dispatch(
      setOwnedDocs([{ name: "a.pdf", key: "k1", state: "selected" }]),
    );
    store.dispatch(setOwnedSigning("k1"));
    expect(store.getState().main.owned_multisign[0].state).toEqual("signing");
  });

  it("startSigningInvited marks the doc signing, by key", () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "a.pdf", key: "k1", state: "selected" }]),
    );
    store.dispatch(startSigningInvited("k1"));
    expect(store.getState().main.pending_multisign[0].state).toEqual("signing");
  });

  it("startSigningOwned marks the doc signing, by name", () => {
    const store = mkStore();
    store.dispatch(
      setOwnedDocs([{ name: "a.pdf", key: "k1", state: "selected" }]),
    );
    store.dispatch(startSigningOwned("a.pdf"));
    expect(store.getState().main.owned_multisign[0].state).toEqual("signing");
  });

  it("hideInvitedPreview and hideOwnedPreview unset show, by name", () => {
    const store = mkStore();
    store.dispatch(setInvitedDocs([{ name: "a.pdf", key: "k1", show: true }]));
    store.dispatch(setOwnedDocs([{ name: "b.pdf", key: "k2", show: true }]));
    store.dispatch(hideInvitedPreview("a.pdf"));
    store.dispatch(hideOwnedPreview("b.pdf"));
    expect(store.getState().main.pending_multisign[0].show).toEqual(false);
    expect(store.getState().main.owned_multisign[0].show).toEqual(false);
  });

  it("setInvitedState and setOwnedState merge payloads", () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "a.pdf", key: "k1", state: "loaded" }]),
    );
    store.dispatch(setOwnedDocs([{ name: "b.pdf", key: "k2", state: "loaded" }]));
    store.dispatch(setInvitedState({ key: "k1", state: "declined" }));
    store.dispatch(setOwnedState({ name: "b.pdf", state: "signed" }));
    expect(store.getState().main.pending_multisign[0].state).toEqual(
      "declined",
    );
    expect(store.getState().main.owned_multisign[0].state).toEqual("signed");
  });

  it("forced invited previews show, hide and confirm", () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([
        { name: "a.pdf", key: "k1", state: "unconfirmed", showForced: false },
      ]),
    );
    store.dispatch(showForcedInvitedPreview("a.pdf"));
    expect(store.getState().main.pending_multisign[0].showForced).toEqual(true);
    store.dispatch(hideForcedInvitedPreview("a.pdf"));
    expect(store.getState().main.pending_multisign[0].showForced).toEqual(
      false,
    );
    store.dispatch(showForcedInvitedPreview("a.pdf"));
    store.dispatch(confirmForcedInvitedPreview("k1"));
    const doc = store.getState().main.pending_multisign[0];
    expect(doc.showForced).toEqual(false);
    expect(doc.state).toEqual("selected");
  });

  it("updateInvitations merges stored docs, skipping signed owned docs", () => {
    const store = mkStore();
    store.dispatch(
      setOwnedDocs([
        { name: "a.pdf", key: "o1", state: "signing" },
        { name: "b.pdf", key: "o2", state: "signed", message: "done" },
      ]),
    );
    store.dispatch(
      setInvitedDocs([{ name: "c.pdf", key: "i1", state: "signing" }]),
    );
    store.dispatch(
      updateInvitations({
        owned: [
          { key: "o1", state: "loaded" },
          { key: "o2", state: "loaded" },
        ],
        invited: [{ key: "i1", state: "loaded" }],
      }),
    );
    const main = store.getState().main;
    expect(main.owned_multisign[0].state).toEqual("loaded");
    // signed owned docs are not touched
    expect(main.owned_multisign[1].state).toEqual("signed");
    expect(main.pending_multisign[0].state).toEqual("loaded");
  });

  it("updateInvitationsFailed fails all signing docs", () => {
    const store = mkStore();
    store.dispatch(
      setOwnedDocs([
        { name: "a.pdf", key: "o1", state: "signing" },
        { name: "b.pdf", key: "o2", state: "loaded" },
      ]),
    );
    store.dispatch(
      setInvitedDocs([{ name: "c.pdf", key: "i1", state: "signing" }]),
    );
    store.dispatch(updateInvitationsFailed({ message: "went wrong" }));
    const main = store.getState().main;
    expect(main.owned_multisign[0].state).toEqual("failed-signing");
    expect(main.owned_multisign[0].message).toEqual("went wrong");
    expect(main.owned_multisign[1].state).toEqual("loaded");
    expect(main.pending_multisign[0].state).toEqual("failed-signing");
  });

  it("invitationsSignFailure fails all signing docs", () => {
    const store = mkStore();
    store.dispatch(setOwnedDocs([{ name: "a.pdf", key: "o1", state: "signing" }]));
    store.dispatch(
      setInvitedDocs([{ name: "c.pdf", key: "i1", state: "signing" }]),
    );
    store.dispatch(invitationsSignFailure("no luck"));
    const main = store.getState().main;
    expect(main.owned_multisign[0].state).toEqual("failed-signing");
    expect(main.owned_multisign[0].message).toEqual("no luck");
    expect(main.pending_multisign[0].state).toEqual("failed-signing");
    expect(main.pending_multisign[0].message).toEqual("no luck");
  });

  it("enableContextualHelp sets the showHelp flag", () => {
    const store = mkStore();
    store.dispatch(enableContextualHelp(false));
    expect(store.getState().main.showHelp).toEqual(false);
  });

  it("startDelegating and stopDelegating toggle the delegating flag", () => {
    const store = mkStore();
    store.dispatch(setInvitedDocs([{ name: "a.pdf", key: "k1" }]));
    store.dispatch(startDelegating("k1"));
    expect(store.getState().main.pending_multisign[0].delegating).toEqual(true);
    store.dispatch(stopDelegating("k1"));
    expect(store.getState().main.pending_multisign[0].delegating).toEqual(
      false,
    );
  });

  it("setVisibilityTimer and setFetchTimer keep the timers", () => {
    const store = mkStore();
    store.dispatch(setVisibilityTimer(12345));
    store.dispatch(setFetchTimer(42));
    expect(store.getState().main.visibility_timer).toEqual(12345);
    expect(store.getState().main.fetch_timer).toEqual(42);
  });
});

describe("fetchConfig", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
    localStorage.clear();
  });

  it("merges the payload into main state on success", async () => {
    fetchMock.get("/sign/config", {
      csrf_token: "csrf-abc",
      ...configPayload({ unauthn: true, poll: true }),
    });
    const store = mkStore();
    await store.dispatch(fetchConfig());
    await flush();
    const state = store.getState();
    expect(state.main.loading).toEqual(false);
    expect(state.main.csrf_token).toEqual("csrf-abc");
    expect(state.main.unauthn).toEqual(true);
    expect(state.main.signer_attributes.eppn).toEqual("tester@example.org");
    // poll and skipped are dispatched to their slices, not kept in main
    expect(state.main.poll).toEqual(undefined);
    expect(state.main.skipped).toEqual(undefined);
    expect(state.poll.poll).toEqual(true);
    expect(state.inviteform.allowbankid).toEqual(true);
  });

  it("honors the configPath argument", async () => {
    fetchMock.get("/sign/config-eid/invite-123", configPayload());
    const store = mkStore();
    await store.dispatch(
      fetchConfig({ configPath: "/sign/config-eid/invite-123", intl: intl }),
    );
    await flush();
    expect(store.getState().main.signer_attributes.eppn).toEqual(
      "tester@example.org",
    );
  });

  it("adds skipped documents to the documents state and the db", async () => {
    fetchMock.get(
      "/sign/config",
      configPayload({
        skipped: [
          {
            name: "skipped.pdf",
            type: "application/pdf",
            key: "sk-1",
            signed_content: b64SamplePDFData,
            pprinted: "pp-1",
          },
          {
            name: "skipped.xml",
            type: "application/xml",
            key: "sk-2",
            signed_content: btoa("<doc/>"),
            pprinted: "pp-2",
          },
        ],
      }),
    );
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    const docs = store.getState().documents.documents;
    expect(docs.length).toEqual(2);
    expect(docs[0].name).toEqual("skipped.pdf");
    expect(docs[0].state).toEqual("signed");
    expect(docs[0].blob.startsWith("data:application/pdf;base64,")).toEqual(
      true,
    );
    expect(docs[1].name).toEqual("skipped.xml");
    expect(docs[1].blob.startsWith("data:application/xml;base64,")).toEqual(
      true,
    );
  });

  it("notifies and nulls signer_attributes on an error response", async () => {
    fetchMock.get("/sign/config", {
      error: true,
      message: "no config for you",
      csrf_token: "csrf-err",
    });
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    const state = store.getState();
    expect(state.main.loading).toEqual(false);
    expect(state.main.signer_attributes).toEqual(null);
    expect(state.main.csrf_token).toEqual("csrf-err");
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "no config for you",
    });
  });

  it("notifies on a non-JSON response", async () => {
    fetchMock.get("/sign/config", { body: "not json", status: 200 });
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    const state = store.getState();
    expect(state.main.signer_attributes).toEqual(null);
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem fetching configuration",
    });
  });

  it("notifies on a network error", async () => {
    fetchMock.get("/sign/config", {
      throws: new TypeError("Failed to fetch"),
    });
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    const state = store.getState();
    expect(state.main.signer_attributes).toEqual(null);
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem fetching configuration",
    });
  });
});

describe("getPartiallySignedDoc", () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it("uses the local copy when the doc already has a blob", async () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([
        {
          name: "inv.pdf",
          key: "k1",
          type: "application/pdf",
          blob: "data:application/pdf;base64,QUJD",
          pprinted: "pp-local",
          show: false,
        },
      ]),
    );
    await store.dispatch(
      getPartiallySignedDoc({
        key: "k1",
        stateKey: "pending_multisign",
        intl: intl,
        show: true,
        showForced: false,
      }),
    );
    const doc = store.getState().main.pending_multisign[0];
    expect(doc.show).toEqual(true);
    expect(doc.blob).toEqual("data:application/pdf;base64,QUJD");
  });

  it("fetches the doc from the backend and prefixes the blob", async () => {
    fetchMock.post("/sign/get-partially-signed", {
      csrf_token: "csrf-part",
      payload: { blob: "QUJD", pprinted: "pp-remote" },
    });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "k1", type: "application/pdf" }]),
    );
    await store.dispatch(
      getPartiallySignedDoc({
        key: "k1",
        stateKey: "pending_multisign",
        intl: intl,
        show: true,
        showForced: false,
      }),
    );
    const state = store.getState();
    const doc = state.main.pending_multisign[0];
    expect(doc.blob).toEqual("data:application/pdf;base64,QUJD");
    expect(doc.pprinted).toEqual("pp-remote");
    expect(doc.show).toEqual(true);
    expect(doc.showForced).toEqual(false);
    expect(state.main.csrf_token).toEqual("csrf-part");
  });

  it("notifies on an error response", async () => {
    fetchMock.post("/sign/get-partially-signed", {
      error: true,
      message: "gone",
    });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "k1", type: "application/pdf" }]),
    );
    // retried: true makes the thunk throw instead of retrying; the thunk
    // rejects and the doc is left untouched.
    const action = await store.dispatch(
      getPartiallySignedDoc({
        key: "k1",
        stateKey: "pending_multisign",
        intl: intl,
        show: false,
        showForced: false,
        retried: true,
      }),
    );
    expect(action.type).toEqual("main/getPartiallySignedDoc/rejected");
    await flush();
    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem fetching document from the backend, please try again",
    });
    const doc = store.getState().main.pending_multisign[0];
    expect(doc.blob).toEqual(undefined);
  });

  it("retries once on a transient error response, without a toast", async () => {
    fetchMock
      .post(
        "/sign/get-partially-signed",
        { error: true, message: "transient" },
        { repeat: 1 },
      )
      .post(
        "/sign/get-partially-signed",
        {
          csrf_token: "csrf-part",
          payload: { blob: "QUJD", pprinted: "pp-remote" },
        },
        { repeat: 1, overwriteRoutes: false },
      );
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "k1", type: "application/pdf" }]),
    );
    await store.dispatch(
      getPartiallySignedDoc({
        key: "k1",
        stateKey: "pending_multisign",
        intl: intl,
        show: true,
        showForced: false,
      }),
    );
    await flush();
    const state = store.getState();
    const doc = state.main.pending_multisign[0];
    expect(doc.blob).toEqual("data:application/pdf;base64,QUJD");
    expect(doc.pprinted).toEqual("pp-remote");
    expect(state.notifications.message).toEqual(null);
  });
});

describe("declineSigning", () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it("marks the doc declined on success", async () => {
    fetchMock.post("/sign/decline-invitation", { csrf_token: "csrf-dec" });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "k1", state: "loaded" }]),
    );
    await store.dispatch(declineSigning({ key: "k1", intl: intl }));
    const doc = store.getState().main.pending_multisign[0];
    expect(doc.state).toEqual("declined");
    expect(doc.message).toEqual("You have declined to sign this document.");
    expect(store.getState().main.csrf_token).toEqual("csrf-dec");
  });

  it("notifies on an error response", async () => {
    fetchMock.post("/sign/decline-invitation", {
      error: true,
      message: "cannot decline",
    });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "k1", state: "loaded" }]),
    );
    const action = await store.dispatch(
      declineSigning({ key: "k1", intl: intl }),
    );
    expect(action.type).toEqual("main/declineSigning/rejected");
    await flush();
    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem declining signature",
    });
    const doc = store.getState().main.pending_multisign[0];
    expect(doc.state).toEqual("loaded");
  });
});

describe("delegateSignature", () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it("removes the doc and notifies on success", async () => {
    fetchMock.post("/sign/delegate-invitation", {
      message: "delegation created",
    });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "dk", state: "loaded" }]),
    );
    await store.dispatch(
      delegateSignature({
        values: {
          inviteKey: "ik",
          documentKey: "dk",
          delegationName: "Delegate Delegated",
          delegationEmail: "delegate@example.org",
        },
        intl: intl,
      }),
    );
    await flush();
    expect(store.getState().main.pending_multisign).toEqual([]);
    expect(store.getState().notifications.message).toEqual({
      level: "success",
      message: "delegation created",
    });
  });

  it("notifies on an error response", async () => {
    fetchMock.post("/sign/delegate-invitation", {
      error: true,
      message: "cannot delegate",
    });
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([{ name: "inv.pdf", key: "dk", state: "loaded" }]),
    );
    const action = await store.dispatch(
      delegateSignature({
        values: {
          inviteKey: "ik",
          documentKey: "dk",
          delegationName: "Delegate Delegated",
          delegationEmail: "delegate@example.org",
        },
        intl: intl,
      }),
    );
    expect(action.type).toEqual("main/delegateSignature/rejected");
    await flush();
    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem delegating signature",
    });
    expect(store.getState().main.pending_multisign.length).toEqual(1);
  });
});

describe("draft downloads", () => {
  afterEach(() => {
    fetchMock.restore();
    saveAs.mockClear();
  });

  it("downloadPersonalDraft saves the doc's blob under its name", async () => {
    const store = mkStore();
    store.dispatch(
      addDocument({
        name: "personal.pdf",
        type: "application/pdf",
        key: "pk",
        blob: "data:application/pdf;base64,QUJD",
      }),
    );
    await store.dispatch(downloadPersonalDraft({ docKey: "pk", intl: intl }));
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0][1]).toEqual("personal.pdf");
  });

  it("downloadInvitedDraft prefers signedContent and adds a draft suffix", async () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([
        {
          name: "inv.pdf",
          type: "application/pdf",
          key: "k1",
          blob: "data:application/pdf;base64,QUJD",
          signedContent: "data:application/pdf;base64,REVG",
        },
      ]),
    );
    await store.dispatch(downloadInvitedDraft({ docKey: "k1", intl: intl }));
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0][1]).toEqual("inv-draft.pdf");
  });

  it("downloadInvitedDraft falls back to the local blob", async () => {
    const store = mkStore();
    store.dispatch(
      setInvitedDocs([
        {
          name: "inv.pdf",
          type: "application/pdf",
          key: "k1",
          blob: "data:application/pdf;base64,QUJD",
        },
      ]),
    );
    await store.dispatch(downloadInvitedDraft({ docKey: "k1", intl: intl }));
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0][1]).toEqual("inv-draft.pdf");
  });
});

describe("finishInvited", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
    localStorage.clear();
  });

  it("does nothing when the doc is not among the pending invitations", async () => {
    const store = mkStore();
    await store.dispatch(
      finishInvited({ doc: { id: "missing" }, intl: intl }),
    );
    expect(store.getState().main.pending_multisign).toEqual([]);
  });

  it("just marks the doc signed when signing through bankid", async () => {
    fetchMock.get(
      "/sign/config",
      configPayload({
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
          using_bankid: true,
        },
      }),
    );
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    store.dispatch(
      setInvitedDocs([
        { name: "inv.pdf", key: "k1", type: "application/pdf", state: "signing" },
      ]),
    );
    await store.dispatch(
      finishInvited({
        doc: { id: "k1", type: "application/pdf" },
        intl: intl,
      }),
    );
    expect(store.getState().main.pending_multisign[0].state).toEqual("signed");
  });

  it("moves the signed invitation to the personal documents", async () => {
    fetchMock.get("/sign/config", configPayload()).post("/sign/add-doc", {
      message: "document added",
      payload: { ref: "ref-1", sign_requirement: "sr-1" },
    });
    const store = mkStore();
    await store.dispatch(fetchConfig({ intl: intl }));
    await flush();
    store.dispatch(
      setInvitedDocs([
        {
          name: "inv.pdf",
          key: "k1",
          type: "application/pdf",
          state: "signing",
          owner: "owner@example.org",
        },
      ]),
    );
    await store.dispatch(
      finishInvited({
        doc: {
          id: "k1",
          type: "application/pdf",
          signed_content: b64SamplePDFData,
          pprinted: "pp-1",
          validated: true,
          signed: "signed-info",
        },
        intl: intl,
      }),
    );
    await flush();
    const state = store.getState();
    expect(state.main.pending_multisign).toEqual([]);
    const docs = state.documents.documents;
    expect(docs.length).toEqual(1);
    expect(docs[0].name).toEqual("inv-draft.pdf");
    expect(docs[0].state).toEqual("loaded");
    expect(docs[0].signed_draft).toEqual(true);
  });
});
