import fetchMock from "fetch-mock";

import { edusignStore } from "init-app/init-app";
import { resetDb } from "init-app/database";
import { fetchConfig } from "slices/Main";
import { showForm } from "slices/Modals";
import { addDocument } from "slices/Documents";
import {
  sendInvites,
  editInvites,
  removeInvites,
  resendInvitations,
} from "slices/Invitations";

const intl = { formatMessage: ({ defaultMessage }) => defaultMessage };

// let promise chains started by the thunks (addNotification, loadDocuments)
// settle before asserting
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const ownedKey = "11111111-1111-1111-1111-111111111111";

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
    ui_defaults: { sendsigned: true, skip_final: true },
    available_loas: [],
    ...overrides,
  },
});

const ownedDoc = (overrides = {}) => ({
  name: "owned.pdf",
  type: "application/pdf",
  state: "incomplete",
  size: 1500,
  key: ownedKey,
  signed: [],
  declined: [],
  pending: [{ name: "Tester Invited1", email: "invited1@example.org" }],
  prev_signatures: "",
  ...overrides,
});

const localDoc = {
  name: "test.pdf",
  size: 1500,
  type: "application/pdf",
  blob: "data:application/pdf;base64,dummyb64",
  key: "local-doc-key",
  id: 1,
  state: "loaded",
  prev_signatures: "",
};

const setupStore = async (configOverrides = {}) => {
  fetchMock.get("/sign/config", configPayload(configOverrides));
  const store = edusignStore();
  await store.dispatch(fetchConfig({ intl: intl }));
  await flush();
  return store;
};

describe("sendInvites thunk", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
  });

  const inviteValues = (overrides = {}) => ({
    invitees: [
      {
        name: "Tester Invited1",
        email: "invited1@example.org",
        lang: "en",
        ssn: "",
      },
    ],
    invitationText: "please sign",
    isTemplate: false,
    sendsignedChoice: true,
    skipfinalChoice: false,
    orderedChoice: true,
    ...overrides,
  });

  const sendInvitesSuccess = async (values) => {
    const store = await setupStore();
    store.dispatch(addDocument(localDoc));
    store.dispatch(showForm(localDoc.id));
    fetchMock.post("/sign/create-multi-sign", { payload: {} });

    await store.dispatch(sendInvites({ values: values, intl: intl }));
    await flush();
    return store;
  };

  it("sends the form data and moves the document to owned_multisign", async () => {
    const store = await sendInvitesSuccess(inviteValues());

    const body = JSON.parse(fetchMock.lastOptions("/sign/create-multi-sign").body);
    expect(body.payload.owner).toEqual("tester@example.org");
    expect(body.payload.invites).toEqual([
      {
        name: "Tester Invited1",
        email: "invited1@example.org",
        lang: "en",
        ssn: "",
      },
    ]);
    expect(body.payload.text).toEqual("please sign");
    expect(body.payload.sendsigned).toEqual(true);
    expect(body.payload.skipfinal).toEqual(false);
    expect(body.payload.allowbankid).toEqual(false);
    expect(body.payload.ordered).toEqual(true);
    expect(body.payload.loa).toEqual("none");
    expect(body.payload.document).toEqual({
      key: localDoc.key,
      name: localDoc.name,
      blob: "dummyb64",
      size: localDoc.size,
      type: localDoc.type,
      prev_signatures: "",
    });

    const state = store.getState();
    expect(state.documents.documents.length).toEqual(0);
    expect(state.main.owned_multisign.length).toEqual(1);
    const owned = state.main.owned_multisign[0];
    expect(owned.key).toEqual(localDoc.key);
    expect(owned.name).toEqual(localDoc.name);
    expect(owned.state).toEqual("incomplete");
    expect(owned.loa).toEqual("none,None");
    expect(owned.pending).toEqual(inviteValues().invitees);
    expect(owned.signed).toEqual([]);
    expect(owned.declined).toEqual([]);
    expect(state.poll.initialPoll).toEqual(true);
    expect(state.poll.poll).toEqual(true);
    expect(state.notifications.message).toEqual(null);
  });

  it("labels the invitation with the low loa", async () => {
    const store = await sendInvitesSuccess(inviteValues({ loa: "low" }));
    const body = JSON.parse(fetchMock.lastOptions("/sign/create-multi-sign").body);
    expect(body.payload.loa).toEqual("low");
    expect(store.getState().main.owned_multisign[0].loa).toEqual("low,Low");
  });

  it("labels the invitation with the medium loa", async () => {
    const store = await sendInvitesSuccess(inviteValues({ loa: "medium" }));
    expect(store.getState().main.owned_multisign[0].loa).toEqual("medium,Medium");
  });

  it("labels the invitation with the high loa", async () => {
    const store = await sendInvitesSuccess(inviteValues({ loa: "high" }));
    expect(store.getState().main.owned_multisign[0].loa).toEqual("high,High");
  });

  it("notifies and keeps the document when the backend returns an error", async () => {
    const store = await setupStore();
    store.dispatch(addDocument(localDoc));
    store.dispatch(showForm(localDoc.id));
    fetchMock.post("/sign/create-multi-sign", {
      message: "dummy error",
      error: true,
    });

    await store.dispatch(sendInvites({ values: inviteValues(), intl: intl }));
    await flush();

    const state = store.getState();
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem sending invitations to sign, please try again",
    });
    expect(state.main.owned_multisign.length).toEqual(0);
    expect(state.documents.documents.length).toEqual(1);
  });

  it("removes the persisted invitation after a 502 from the backend", async () => {
    const store = await setupStore();
    store.dispatch(addDocument(localDoc));
    store.dispatch(showForm(localDoc.id));
    fetchMock
      .post("/sign/create-multi-sign", 502)
      .post("/sign/remove-multi-sign", { csrf_token: "dummy token" });

    await store.dispatch(sendInvites({ values: inviteValues(), intl: intl }));
    await flush();

    expect(fetchMock.called("/sign/remove-multi-sign")).toEqual(true);
    const body = JSON.parse(fetchMock.lastOptions("/sign/remove-multi-sign").body);
    expect(body.payload).toEqual({ key: localDoc.key });
    const state = store.getState();
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem sending invitations to sign, please try again",
    });
    expect(state.main.owned_multisign.length).toEqual(0);
  });

  it("notifies when the network fails", async () => {
    const store = await setupStore();
    store.dispatch(addDocument(localDoc));
    store.dispatch(showForm(localDoc.id));
    fetchMock.post("/sign/create-multi-sign", {
      throws: new TypeError("network failure"),
    });

    await store.dispatch(sendInvites({ values: inviteValues(), intl: intl }));
    await flush();

    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem sending invitations to sign, please try again",
    });
  });
});

describe("editInvites thunk", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
  });

  const editValues = (overrides = {}) => ({
    documentKey: ownedKey,
    invitationText: "changed text",
    sendsignedChoice: true,
    skipfinalChoice: true,
    invitees: [
      { name: "New Invitee", email: "new@example.org", lang: "sv" },
    ],
    ...overrides,
  });

  it("sends the new invitees and updates the owned document", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/edit-multi-sign", { csrf_token: "dummy token" });

    await store.dispatch(editInvites({ values: editValues(), intl: intl }));
    await flush();

    const body = JSON.parse(fetchMock.lastOptions("/sign/edit-multi-sign").body);
    expect(body.payload).toEqual({
      key: ownedKey,
      text: "changed text",
      sendsigned: true,
      skipfinal: true,
      invites: [{ name: "New Invitee", email: "new@example.org", lang: "sv" }],
    });
    const owned = store.getState().main.owned_multisign[0];
    expect(owned.pending).toEqual(editValues().invitees);
    expect(owned.state).toEqual("incomplete");
    expect(store.getState().notifications.message).toEqual(null);
  });

  it("marks the document loaded when no invitees are left but some signed", async () => {
    const store = await setupStore({
      owned_multisign: [
        ownedDoc({
          signed: [{ name: "Signer", email: "signer@example.org" }],
        }),
      ],
    });
    fetchMock.post("/sign/edit-multi-sign", { csrf_token: "dummy token" });

    await store.dispatch(
      editInvites({ values: editValues({ invitees: [] }), intl: intl }),
    );
    await flush();

    const body = JSON.parse(fetchMock.lastOptions("/sign/edit-multi-sign").body);
    expect(body.payload.invites).toEqual([]);
    const owned = store.getState().main.owned_multisign[0];
    expect(owned.pending).toEqual([]);
    expect(owned.state).toEqual("loaded");
  });

  it("notifies and keeps the invitation when the backend returns an error", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/edit-multi-sign", {
      message: "dummy error",
      error: true,
    });

    await store.dispatch(editInvites({ values: editValues(), intl: intl }));
    await flush();

    const state = store.getState();
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem editing invitation to sign, please try again",
    });
    expect(state.main.owned_multisign[0].pending).toEqual(ownedDoc().pending);
    expect(state.main.owned_multisign[0].state).toEqual("incomplete");
  });

  it("notifies after a 502 from the backend", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/edit-multi-sign", 502);

    await store.dispatch(editInvites({ values: editValues(), intl: intl }));
    await flush();

    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem editing invitation to sign, please try again",
    });
  });

  it("restores the document to personal when no invitees are left", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock
      .post("/sign/get-partially-signed", {
        payload: { blob: "cGFydGlhbA==", pprinted: "dummy pprint" },
      })
      .post("/sign/remove-multi-sign", { csrf_token: "dummy token" });

    await store.dispatch(
      editInvites({ values: editValues({ invitees: [] }), intl: intl }),
    );
    await flush();

    expect(fetchMock.called("/sign/get-partially-signed")).toEqual(true);
    expect(fetchMock.called("/sign/remove-multi-sign")).toEqual(true);
    const state = store.getState();
    expect(state.notifications.message).toEqual(null);
    expect(state.main.owned_multisign.length).toEqual(0);
    expect(state.documents.documents.length).toEqual(1);
    const restored = state.documents.documents[0];
    expect(restored.state).toEqual("loaded");
    expect(restored.blob).toEqual("data:application/pdf;base64,cGFydGlhbA==");
    expect(restored.pprinted).toEqual("dummy pprint");
    expect(restored.pending).toEqual(undefined);
  });
});

describe("removeInvites thunk", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it("removes the invitation and notifies success", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/remove-multi-sign", { csrf_token: "dummy token" });

    const result = await store.dispatch(
      removeInvites({ doc: { key: ownedKey }, intl: intl }),
    );
    await flush();

    const body = JSON.parse(fetchMock.lastOptions("/sign/remove-multi-sign").body);
    expect(body.payload).toEqual({ key: ownedKey });
    expect(result.payload).toEqual(ownedKey);
    const state = store.getState();
    expect(state.main.owned_multisign.length).toEqual(0);
    expect(state.notifications.message).toEqual({
      level: "success",
      message: "Success removing multi sign request",
    });
  });

  it("finds the invitation by the id key as well", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/remove-multi-sign", { csrf_token: "dummy token" });

    const result = await store.dispatch(
      removeInvites({ doc: { id: ownedKey }, intl: intl }),
    );
    await flush();

    expect(result.payload).toEqual(ownedKey);
    expect(store.getState().main.owned_multisign.length).toEqual(0);
  });

  it("notifies and keeps the invitation when the backend returns an error", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/remove-multi-sign", {
      message: "dummy error",
      error: true,
    });

    await store.dispatch(
      removeInvites({ doc: { key: ownedKey }, intl: intl }),
    );
    await flush();

    const state = store.getState();
    expect(state.main.owned_multisign.length).toEqual(1);
    expect(state.notifications.message).toEqual({
      level: "danger",
      message: "Problem removing multi sign request, please try again",
    });
  });

  it("does nothing for an unknown document", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/remove-multi-sign", { csrf_token: "dummy token" });

    const result = await store.dispatch(
      removeInvites({ doc: { key: "unknown key" }, intl: intl }),
    );
    await flush();

    expect(result.payload).toEqual(undefined);
    expect(fetchMock.called("/sign/remove-multi-sign")).toEqual(false);
    expect(store.getState().main.owned_multisign.length).toEqual(1);
  });
});

describe("resendInvitations thunk", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
  });

  const resendValues = {
    documentId: ownedKey,
    "re-invitationText": "reminder text",
  };

  it("sends the reminder and notifies success", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/send-multisign-reminder", {
      csrf_token: "dummy token",
    });

    const result = await store.dispatch(
      resendInvitations({ values: resendValues, intl: intl }),
    );
    await flush();

    const body = JSON.parse(
      fetchMock.lastOptions("/sign/send-multisign-reminder").body,
    );
    expect(body.payload).toEqual({ key: ownedKey, text: "reminder text" });
    expect(result.payload).toEqual(ownedKey);
    expect(store.getState().notifications.message).toEqual({
      level: "success",
      message: "Success resending invitations to sign",
    });
  });

  it("notifies when the backend returns an error", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/send-multisign-reminder", {
      message: "dummy error",
      error: true,
    });

    await store.dispatch(
      resendInvitations({ values: resendValues, intl: intl }),
    );
    await flush();

    expect(store.getState().notifications.message).toEqual({
      level: "danger",
      message: "Problem sending invitations to sign, please try again",
    });
  });

  it("does nothing for an unknown document", async () => {
    const store = await setupStore({ owned_multisign: [ownedDoc()] });
    fetchMock.post("/sign/send-multisign-reminder", {
      csrf_token: "dummy token",
    });

    const result = await store.dispatch(
      resendInvitations({
        values: { ...resendValues, documentId: "unknown key" },
        intl: intl,
      }),
    );
    await flush();

    expect(result.payload).toEqual(undefined);
    expect(fetchMock.called("/sign/send-multisign-reminder")).toEqual(false);
  });
});
