import { waitFor } from "@testing-library/react";
import fetchMock from "@fetch-mock/jest";

import { edusignStore } from "init-app/init-app";
import { resetDb } from "init-app/database";
import { b64SamplePDFData } from "tests/test-utils";

import al3Reducer, { showAL3Warning, hideAL3Warning } from "slices/AL3Warning";
import fastReducer, {
  enableFastSignature,
  disableFastSignature,
} from "slices/FastSignature";
import userInfoReducer, { showUserInfo, hideUserInfo } from "slices/UserInfo";
import overlayReducer, { setActiveId, unsetActiveId } from "slices/Overlay";
import modalsReducer, {
  showForm,
  hideForm,
  showResend,
  hideResend,
  showPreview,
  hidePreview,
  showEditInvitationForm,
  hideEditInvitationForm,
} from "slices/Modals";
import templatesReducer, {
  setTemplates,
  addTemplate,
  rmTemplate,
  showTemplatePreview,
  hideTemplatePreview,
  removeTemplate,
} from "slices/Templates";
import pdfFormsReducer, {
  showPDFForm,
  hidePDFForm,
  sendPDFForm,
} from "slices/PDFForms";
import {
  checkStatus,
  extractCsrfToken,
  preparePayload,
  esFetch,
  getLocation,
  getRequest,
} from "slices/fetch-utils";
import { fetchConfig } from "slices/Main";

const intl = { formatMessage: ({ defaultMessage }) => defaultMessage };

// give not-awaited inner dispatches (addNotification) time to settle
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("AL3Warning slice", function () {
  it("shows and hides the warning", function () {
    const initial = al3Reducer(undefined, { type: "init" });
    expect(initial).toEqual({ show: false });
    const shown = al3Reducer(initial, showAL3Warning());
    expect(shown.show).toEqual(true);
    const hidden = al3Reducer(shown, hideAL3Warning());
    expect(hidden.show).toEqual(false);
  });
});

describe("FastSignature slice", function () {
  it("enables and disables fast signature", function () {
    const initial = fastReducer(undefined, { type: "init" });
    expect(initial).toEqual({ show: null });
    const enabled = fastReducer(initial, enableFastSignature("doc-key"));
    expect(enabled.show).toEqual("doc-key");
    const disabled = fastReducer(enabled, disableFastSignature());
    expect(disabled.show).toEqual(null);
  });
});

describe("UserInfo slice", function () {
  it("shows and hides the user info", function () {
    const initial = userInfoReducer(undefined, { type: "init" });
    expect(initial).toEqual({ show: false });
    const shown = userInfoReducer(initial, showUserInfo());
    expect(shown.show).toEqual(true);
    const hidden = userInfoReducer(shown, hideUserInfo());
    expect(hidden.show).toEqual(false);
  });
});

describe("Overlay slice", function () {
  it("sets and unsets the active overlay", function () {
    const initial = overlayReducer(undefined, { type: "init" });
    expect(initial).toEqual({ active: "", previous: "" });
    const one = overlayReducer(initial, setActiveId("help-1"));
    expect(one).toEqual({ active: "help-1", previous: "" });
    const two = overlayReducer(one, setActiveId("help-2"));
    expect(two).toEqual({ active: "help-2", previous: "help-1" });
    const unset = overlayReducer(two, unsetActiveId());
    expect(unset).toEqual({ active: "help-1", previous: "" });
  });
});

describe("Modals slice reducers", function () {
  it("shows and hides the form, resend and preview modals", function () {
    const initial = modalsReducer(undefined, { type: "init" });
    expect(initial).toEqual({
      show_form: false,
      form_id: null,
      show_resend: false,
      resend_id: null,
      show_preview: false,
      preview_id: null,
    });

    const withForm = modalsReducer(initial, showForm("form-1"));
    expect(withForm.show_form).toEqual(true);
    expect(withForm.form_id).toEqual("form-1");
    const noForm = modalsReducer(withForm, hideForm());
    expect(noForm.show_form).toEqual(false);
    expect(noForm.form_id).toEqual(null);

    const withResend = modalsReducer(initial, showResend({ key: "key-1" }));
    expect(withResend.show_resend).toEqual(true);
    expect(withResend.resend_id).toEqual("key-1");
    const noResend = modalsReducer(withResend, hideResend());
    expect(noResend.show_resend).toEqual(false);
    expect(noResend.resend_id).toEqual(null);

    const withPreview = modalsReducer(initial, showPreview("key-2"));
    expect(withPreview.show_preview).toEqual(true);
    expect(withPreview.preview_id).toEqual("key-2");
    const noPreview = modalsReducer(withPreview, hidePreview());
    expect(noPreview.show_preview).toEqual(false);
    expect(noPreview.preview_id).toEqual(null);
  });
});

describe("Modals slice thunks", function () {
  afterEach(() => {
    fetchMock.hardReset();
    jest.restoreAllMocks();
  });

  it("showEditInvitationForm opens the form after locking the doc", async function () {
    const store = edusignStore();
    fetchMock.post("/sign/lock-doc", { csrf_token: "lock-token" });
    await store.dispatch(
      showEditInvitationForm({
        key: "key-1",
        form_id: "key-1-edit-invitations",
        intl: intl,
      }),
    );
    const state = store.getState();
    expect(state.modals.show_form).toEqual(true);
    expect(state.modals.form_id).toEqual("key-1-edit-invitations");
    expect(state.main.csrf_token).toEqual("lock-token");
  });

  it("showEditInvitationForm notifies when the backend refuses", async function () {
    // the rejected extraReducer logs the reject value
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const store = edusignStore();
    fetchMock.post("/sign/lock-doc", { error: true, message: "doc is locked" });
    await store.dispatch(
      showEditInvitationForm({
        key: "key-1",
        form_id: "key-1-edit-invitations",
        intl: intl,
      }),
    );
    await flush();
    const state = store.getState();
    expect(state.modals.show_form).toEqual(false);
    expect(state.notifications.message.message).toEqual("doc is locked");
    expect(logSpy).toHaveBeenCalled();
  });

  it("showEditInvitationForm notifies when the fetch fails", async function () {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const store = edusignStore();
    fetchMock.post("/sign/lock-doc", { throws: new TypeError("network down") });
    await store.dispatch(
      showEditInvitationForm({
        key: "key-1",
        form_id: "key-1-edit-invitations",
        intl: intl,
      }),
    );
    await flush();
    const state = store.getState();
    expect(state.modals.show_form).toEqual(false);
    expect(state.notifications.message.message).toEqual(
      "Problem opening edit form, please try again later",
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it("hideEditInvitationForm hides the form after unlocking the doc", async function () {
    const store = edusignStore();
    store.dispatch(showForm("key-2-edit-invitations"));
    fetchMock.post("/sign/unlock-doc", { csrf_token: "unlock-token" });
    await store.dispatch(hideEditInvitationForm());
    const state = store.getState();
    expect(state.modals.show_form).toEqual(false);
    expect(state.modals.form_id).toEqual(null);
    expect(state.main.csrf_token).toEqual("unlock-token");
  });

  it("hideEditInvitationForm hides the form even if unlocking fails", async function () {
    const store = edusignStore();
    // no form_id in the state: the thunk throws before fetching
    await store.dispatch(hideEditInvitationForm());
    expect(store.getState().modals.show_form).toEqual(false);
  });

  it("hideEditInvitationForm with a form_id leaves another open form alone", async function () {
    // The submit path defers the unlock by edit_form_timeout and passes
    // the form_id of the saved form. A form opened since for another
    // document must stay open.
    const store = edusignStore();
    store.dispatch(showForm("key-2-edit-invitations"));
    fetchMock.post("/sign/unlock-doc", { csrf_token: "unlock-token" });
    await store.dispatch(
      hideEditInvitationForm({ form_id: "key-1-edit-invitations" }),
    );
    const state = store.getState();
    expect(state.modals.show_form).toEqual(true);
    expect(state.modals.form_id).toEqual("key-2-edit-invitations");
    expect(state.main.csrf_token).toEqual("unlock-token");
    const body = JSON.parse(fetchMock.callHistory.lastCall().options.body);
    expect(body.payload.key).toEqual("key-1");
  });

  it("hideEditInvitationForm with a form_id hides that same form", async function () {
    const store = edusignStore();
    store.dispatch(showForm("key-1-edit-invitations"));
    fetchMock.post("/sign/unlock-doc", { csrf_token: "unlock-token" });
    await store.dispatch(
      hideEditInvitationForm({ form_id: "key-1-edit-invitations" }),
    );
    expect(store.getState().modals.show_form).toEqual(false);
    expect(store.getState().modals.form_id).toEqual(null);
  });
});

describe("Templates slice reducers", function () {
  it("sets, adds and removes templates", function () {
    const initial = templatesReducer(undefined, { type: "init" });
    expect(initial).toEqual({ documents: [] });

    const two = templatesReducer(
      initial,
      setTemplates([
        { name: "t1.pdf", id: 1 },
        { name: "t2.pdf", id: 2 },
      ]),
    );
    expect(two.documents.length).toEqual(2);

    const three = templatesReducer(two, addTemplate({ name: "t3.pdf", id: 3 }));
    expect(three.documents.length).toEqual(3);

    const removed = templatesReducer(three, rmTemplate(2));
    expect(removed.documents.map((doc) => doc.id)).toEqual([1, 3]);
  });

  it("shows and hides the template preview", function () {
    const initial = {
      documents: [
        { name: "t1.pdf", key: "k1", show: false },
        { name: "t2.pdf", key: "k2", show: false },
      ],
    };
    const shown = templatesReducer(initial, showTemplatePreview("k1"));
    expect(shown.documents[0].show).toEqual(true);
    expect(shown.documents[1].show).toEqual(false);

    const hidden = templatesReducer(shown, hideTemplatePreview("t1.pdf"));
    expect(hidden.documents[0].show).toEqual(false);
    expect(hidden.documents[1].show).toEqual(false);
  });
});

describe("Templates slice thunks", function () {
  beforeEach(async () => {
    await resetDb();
  });

  it("removeTemplate removes a template without db id", async function () {
    const store = edusignStore();
    store.dispatch(setTemplates([{ name: "t1.pdf", key: "k1" }]));
    await store.dispatch(removeTemplate({ docid: undefined, intl: intl }));
    await flush();
    const state = store.getState();
    expect(state.template.documents).toEqual([]);
    expect(state.notifications.message.message).toEqual(
      "Template successfully removed",
    );
  });

  it("removeTemplate removes a template stored in the db", async function () {
    const store = edusignStore();
    store.dispatch(
      setTemplates([
        { name: "t1.pdf", key: "k1", id: 7 },
        { name: "t2.pdf", key: "k2", id: 8 },
      ]),
    );
    await store.dispatch(removeTemplate({ docid: 7, intl: intl }));
    await flush();
    const state = store.getState();
    expect(state.template.documents.map((doc) => doc.id)).toEqual([8]);
  });
});

describe("PDFForms slice reducers", function () {
  it("shows and hides the pdf form", function () {
    const initial = pdfFormsReducer(undefined, { type: "init" });
    expect(initial).toEqual({ document: null });
    const doc = { name: "form.pdf" };
    const shown = pdfFormsReducer(initial, showPDFForm(doc));
    expect(shown.document).toEqual(doc);
    const hidden = pdfFormsReducer(shown, hidePDFForm());
    expect(hidden.document).toEqual(null);
  });
});

describe("PDFForms slice thunks", function () {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.hardReset();
  });

  const formArgs = (extra) => {
    return {
      values: { field1: { name: "field1", value: "value1" } },
      doc: {
        name: "form.pdf",
        size: 1500,
        type: "application/pdf",
        blob: "data:application/pdf;base64," + b64SamplePDFData,
      },
      newname: "filled.pdf",
      intl: intl,
      ...extra,
    };
  };

  it("sendPDFForm notifies when the fetch fails", async function () {
    const store = edusignStore();
    store.dispatch(showPDFForm({ name: "form.pdf" }));
    fetchMock.post("/sign/update-form", {
      throws: new TypeError("network down"),
    });
    await store.dispatch(sendPDFForm(formArgs()));
    await flush();
    const state = store.getState();
    expect(state.pdfform.document).toEqual(null);
    expect(state.notifications.message.message).toEqual(
      "Problem filling in PDF form, please try again",
    );
  });

  it("sendPDFForm notifies when the backend returns an error", async function () {
    const store = edusignStore();
    fetchMock.post("/sign/update-form", {
      error: true,
      message: "cannot fill form",
    });
    await store.dispatch(sendPDFForm(formArgs()));
    await flush();
    const state = store.getState();
    expect(state.notifications.message.message).toEqual("cannot fill form");
  });

  it("sendPDFForm adds the filled document on success", async function () {
    const store = edusignStore();
    // storing the new document in the db needs the signer attributes
    fetchMock.get("/sign/config", {
      payload: {
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
      },
    });
    await store.dispatch(fetchConfig());
    fetchMock
      .post("/sign/update-form", {
        csrf_token: "form-token",
        payload: { document: b64SamplePDFData },
      })
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "filled-ref",
          sign_requirement: "dummy sign requirement",
        },
      });
    await store.dispatch(sendPDFForm(formArgs()));
    // the validation of the new document parses the PDF asynchronously
    await waitFor(
      () =>
        expect(store.getState().documents.documents[0].state).toEqual(
          "unconfirmed",
        ),
      { timeout: 8000 },
    );
    const state = store.getState();
    const docs = state.documents.documents;
    expect(docs.length).toEqual(1);
    expect(docs[0].name).toEqual("filled.pdf");
    expect(state.main.csrf_token).toEqual("form-token");
  });
});

describe("fetch-utils", function () {
  afterEach(() => {
    fetchMock.hardReset();
  });

  it("checkStatus returns the json body on success", async function () {
    const response = new Response(JSON.stringify({ hello: "world" }), {
      status: 200,
    });
    const data = await checkStatus(response);
    expect(data).toEqual({ hello: "world" });
  });

  it("checkStatus throws on an error response", async function () {
    const response = new Response("failure", {
      status: 500,
      statusText: "Internal Server Error",
    });
    await expect(checkStatus(response)).rejects.toThrow(
      "Error response from backend: Internal Server Error",
    );
  });

  it("extractCsrfToken dispatches the token when present", function () {
    const dispatch = jest.fn();
    extractCsrfToken(dispatch, { csrf_token: "the-token" });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].payload).toEqual("the-token");

    dispatch.mockClear();
    extractCsrfToken(dispatch, { payload: {} });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("preparePayload wraps the payload with the csrf token", function () {
    const state = { main: { csrf_token: "the-token" } };
    const body = preparePayload(state, { key: "value" });
    expect(JSON.parse(body)).toEqual({
      csrf_token: "the-token",
      payload: { key: "value" },
    });
  });

  it("esFetch fetches and renews the stale-session timer", async function () {
    fetchMock.get("/dummy/endpoint", { hello: "world" });
    const dispatch = jest.fn();
    const state = {
      main: { fetch_timer: null, stale_from: "none", csrf_token: null },
    };
    const response = await esFetch(
      "/dummy/endpoint",
      getRequest,
      state,
      dispatch,
    );
    const data = await response.json();
    expect(data).toEqual({ hello: "world" });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toEqual("main/setFetchTimer");
    clearTimeout(action.payload);
  });

  it("esFetch clears a previous stale-session timer", async function () {
    fetchMock.get("/dummy/endpoint", { hello: "world" });
    const dispatch = jest.fn();
    const previous = setTimeout(() => {}, 60000);
    const state = {
      main: { fetch_timer: previous, stale_from: "none", csrf_token: null },
    };
    await esFetch("/dummy/endpoint", getRequest, state, dispatch);
    expect(dispatch).toHaveBeenCalledTimes(1);
    clearTimeout(dispatch.mock.calls[0][0].payload);
  });

  it("getLocation returns the resource", function () {
    expect(getLocation("/sign/config")).toEqual("/sign/config");
  });
});
