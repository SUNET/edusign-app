import fetchMock from "fetch-mock";

import { edusignStore } from "init-app/init-app";
import { resetDb, dbSaveDocument, getDb } from "init-app/database";
import { hashCode } from "components/utils";
import {
  FileSaver,
  loadDocuments,
  checkStoredDocuments,
  validateDoc,
  saveDocument,
  removeDocument,
  createDocument,
  prepareDocument,
  startSigning,
  startSigningDoc,
  startSigningDocuments,
  restartSigningDocuments,
  downloadSigned,
  downloadAllSigned,
  skipOwnedSignature,
  showPreview,
  hidePreview,
  showForcedPreview,
  hideForcedPreview,
  confirmForcedPreview,
  removeAllDocuments,
  setState,
  toggleDocSelection,
  rmDocumentByKey,
  addDocument,
} from "slices/Documents";
import { b64SamplePDFData, b64SamplePasswordPDFData } from "tests/test-utils";

const intl = { formatMessage: ({ defaultMessage }) => defaultMessage };

const eppn = "dummy@example.org";

// Seed the main slice through its fetchConfig.fulfilled reducer, which
// merges the payload into the state; this avoids mocking HTTP for setup.
const seedMain = (store, overrides = {}) => {
  store.dispatch({
    type: "main/fetchConfig/fulfilled",
    payload: {
      payload: {
        signer_attributes: {
          eppn: eppn,
          name: "Dummy Tester",
          mail: eppn,
          mail_aliases: [eppn],
        },
        csrf_token: "dummy-csrf-token",
        ...overrides,
      },
    },
  });
};

const samplePDFBlob = "data:application/pdf;base64," + b64SamplePDFData;

const sampleDoc = (overrides = {}) => ({
  name: "test.pdf",
  size: 1500,
  type: "application/pdf",
  blob: samplePDFBlob,
  created: 1,
  state: "loading",
  key: "dummy-key",
  ...overrides,
});

// Wait until cond() holds; for thunks that dispatch other thunks
// without awaiting them.
const until = async (cond) => {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (cond()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("condition not met within 5s");
};

// Read all documents persisted in the IndexedDB db.
const readDb = async () => {
  const db = await getDb(eppn);
  return new Promise((resolve) => {
    const transaction = db.transaction(["documents"]);
    const docs = [];
    transaction.objectStore("documents").openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        docs.push(cursor.value);
        cursor.continue();
      } else {
        resolve(docs);
      }
    };
  });
};

const storageName = "signing-" + hashCode(eppn);

describe("Documents slice", () => {
  let store;

  beforeEach(async () => {
    await resetDb();
    localStorage.clear();
    store = edusignStore();
    seedMain(store);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.restoreAllMocks();
  });

  const docs = () => store.getState().documents.documents;

  describe("reducers", () => {
    it("addDocument and removeAllDocuments", () => {
      store.dispatch(addDocument(sampleDoc()));
      store.dispatch(addDocument(sampleDoc({ name: "b.pdf", key: "k2" })));
      expect(docs().length).toEqual(2);
      store.dispatch(removeAllDocuments());
      expect(docs()).toEqual([]);
    });

    it("shows and hides the preview", () => {
      store.dispatch(addDocument(sampleDoc({ show: false })));
      store.dispatch(showPreview("dummy-key"));
      expect(docs()[0].show).toEqual(true);
      store.dispatch(hidePreview("test.pdf"));
      expect(docs()[0].show).toEqual(false);
    });

    it("shows, hides and confirms the forced preview", () => {
      store.dispatch(addDocument(sampleDoc({ showForced: false })));
      store.dispatch(showForcedPreview("dummy-key"));
      expect(docs()[0].showForced).toEqual(true);
      store.dispatch(hideForcedPreview("test.pdf"));
      expect(docs()[0].showForced).toEqual(false);
      store.dispatch(showForcedPreview("dummy-key"));
      store.dispatch(confirmForcedPreview("dummy-key"));
      expect(docs()[0].showForced).toEqual(false);
      expect(docs()[0].state).toEqual("selected");
    });

    it("removes a document by key", () => {
      store.dispatch(addDocument(sampleDoc()));
      store.dispatch(rmDocumentByKey("dummy-key"));
      expect(docs()).toEqual([]);
    });

    it("toggles document selection", () => {
      store.dispatch(addDocument(sampleDoc({ state: "loaded" })));
      store.dispatch(toggleDocSelection({ name: "test.pdf", select: true }));
      expect(docs()[0].state).toEqual("selected");
      store.dispatch(toggleDocSelection({ name: "test.pdf", select: false }));
      expect(docs()[0].state).toEqual("loaded");
    });

    it("setState merges data into the named document", () => {
      store.dispatch(addDocument(sampleDoc({ state: "loaded" })));
      store.dispatch(
        setState({ name: "test.pdf", state: "selected", message: "hi" }),
      );
      expect(docs()[0].state).toEqual("selected");
      expect(docs()[0].message).toEqual("hi");
    });
  });

  describe("validateDoc", () => {
    const stateWith = (overrides = {}) => ({
      template: { documents: [] },
      documents: { documents: [] },
      main: { owned_multisign: [], max_file_size: 20971520 },
      ...overrides,
    });

    it("marks as dup a document with the name of a template", async () => {
      const doc = await validateDoc(
        sampleDoc(),
        intl,
        stateWith({ template: { documents: [{ name: "test.pdf" }] } }),
      );
      expect(doc.state).toEqual("dup");
    });

    it("marks as dup a loaded document with the same name", async () => {
      const doc = await validateDoc(
        sampleDoc({ created: 2 }),
        intl,
        stateWith({
          documents: { documents: [{ name: "test.pdf", created: 1 }] },
        }),
      );
      expect(doc.state).toEqual("dup");
    });

    it("marks as dup a document with the name of an owned invitation", async () => {
      const doc = await validateDoc(
        sampleDoc(),
        intl,
        stateWith({
          main: { owned_multisign: [{ name: "test.pdf" }], max_file_size: 100 },
        }),
      );
      expect(doc.state).toEqual("dup");
    });

    it("keeps a document already marked as dup", async () => {
      const doc = await validateDoc(
        sampleDoc({ state: "dup" }),
        intl,
        stateWith(),
      );
      expect(doc.state).toEqual("dup");
    });

    it("rejects a document over the size limit", async () => {
      const doc = await validateDoc(
        sampleDoc({ size: 200 }),
        intl,
        stateWith({ main: { owned_multisign: [], max_file_size: 100 } }),
      );
      expect(doc.state).toEqual("failed-loading");
      expect(doc.message).toEqual("Document is too big (max size: {size})");
    });

    it("accepts a valid PDF", async () => {
      const doc = await validateDoc(sampleDoc(), intl, stateWith());
      expect(doc.state).toEqual("loading");
      expect(doc.show).toEqual(false);
    });

    it("rejects a password protected PDF", async () => {
      const doc = await validateDoc(
        sampleDoc({
          blob: "data:application/pdf;base64," + b64SamplePasswordPDFData,
        }),
        intl,
        stateWith(),
      );
      expect(doc.state).toEqual("failed-loading");
      expect(doc.message).toEqual(
        "Please do not supply a password protected document",
      );
    });

    it("rejects a corrupted PDF", async () => {
      const doc = await validateDoc(
        sampleDoc({
          blob: "data:application/pdf;base64," + btoa("this is not a pdf"),
        }),
        intl,
        stateWith(),
      );
      expect(doc.state).toEqual("failed-loading");
      expect(doc.message).toEqual("Document seems corrupted");
    });

    it("accepts a valid XML document", async () => {
      const doc = await validateDoc(
        sampleDoc({
          name: "test.xml",
          type: "application/xml",
          blob: "data:application/xml;base64," + btoa("<a><b>hi</b></a>"),
        }),
        intl,
        stateWith(),
      );
      expect(doc.state).toEqual("loading");
    });

    it("rejects an invalid XML document", async () => {
      const doc = await validateDoc(
        sampleDoc({
          name: "test.xml",
          type: "application/xml",
          blob: "data:application/xml;base64," + btoa("<a><b></a>"),
        }),
        intl,
        stateWith(),
      );
      expect(doc.state).toEqual("failed-loading");
      expect(doc.message).toEqual("Document is unreadable");
    });
  });

  describe("prepareDocument", () => {
    it("marks the document unconfirmed on success", async () => {
      fetchMock.post("/sign/add-doc", {
        message: "document added",
        payload: { ref: "d-ref", sign_requirement: "d-sign-req" },
      });
      await store.dispatch(prepareDocument({ doc: sampleDoc(), intl: intl }));
      expect(docs()[0].state).toEqual("unconfirmed");
      expect(docs()[0].ref).toEqual("d-ref");
    });

    it("marks the document failed on a 413 response", async () => {
      fetchMock.post("/sign/add-doc", 413);
      await store.dispatch(prepareDocument({ doc: sampleDoc(), intl: intl }));
      expect(docs()[0].state).toEqual("failed-preparing");
      expect(docs()[0].message).toEqual(
        "Problem preparing document, it is too big",
      );
    });

    it("marks the document failed on an error message from the backend", async () => {
      fetchMock.post("/sign/add-doc", {
        message: "size limit exceeded",
        error: true,
      });
      await store.dispatch(prepareDocument({ doc: sampleDoc(), intl: intl }));
      expect(docs()[0].state).toEqual("failed-preparing");
      expect(docs()[0].message).toEqual("size limit exceeded");
    });

    it("marks the document failed on a 500 response", async () => {
      fetchMock.post("/sign/add-doc", 500);
      await store.dispatch(prepareDocument({ doc: sampleDoc(), intl: intl }));
      expect(docs()[0].state).toEqual("failed-preparing");
      expect(docs()[0].message).toEqual(
        "There was a problem signing the document",
      );
    });

    it("marks the document failed on a network error", async () => {
      fetchMock.post("/sign/add-doc", {
        throws: new TypeError("network failure"),
      });
      await store.dispatch(prepareDocument({ doc: sampleDoc(), intl: intl }));
      expect(docs()[0].state).toEqual("failed-preparing");
      expect(docs()[0].message).toEqual(
        "There was a problem signing the document",
      );
    });
  });

  describe("createDocument", () => {
    it("prepares and persists a valid PDF", async () => {
      fetchMock.post("/sign/add-doc", {
        message: "document added",
        payload: { ref: "d-ref", sign_requirement: "d-sign-req" },
      });
      const file = sampleDoc();
      store.dispatch(addDocument(file));
      await store.dispatch(createDocument({ doc: file, intl: intl }));
      expect(docs()[0].state).toEqual("unconfirmed");
      expect(docs()[0].ref).toEqual("d-ref");
      const saved = await readDb();
      expect(saved.length).toEqual(1);
      expect(saved[0].name).toEqual("test.pdf");
      expect(saved[0].state).toEqual("unconfirmed");
    });

    it("rejects a duplicated document and keeps the original", async () => {
      const original = sampleDoc({ created: 1, state: "loaded" });
      const dup = sampleDoc({ created: 2, key: "dup-key" });
      store.dispatch(addDocument(original));
      store.dispatch(addDocument(dup));
      await store.dispatch(createDocument({ doc: dup, intl: intl }));
      expect(docs().length).toEqual(1);
      expect(docs()[0].created).toEqual(1);
      expect(store.getState().notifications.message.message).toEqual(
        "A document with that name has already been loaded",
      );
    });

    it("marks a password protected PDF as failed", async () => {
      const file = sampleDoc({
        blob: "data:application/pdf;base64," + b64SamplePasswordPDFData,
      });
      store.dispatch(addDocument(file));
      await store.dispatch(createDocument({ doc: file, intl: intl }));
      expect(docs()[0].state).toEqual("failed-loading");
      expect(docs()[0].message).toEqual(
        "Please do not supply a password protected document",
      );
    });

    it("marks the document as failed when preparation fails", async () => {
      fetchMock.post("/sign/add-doc", {
        message: "backend refused",
        error: true,
      });
      const file = sampleDoc();
      store.dispatch(addDocument(file));
      await store.dispatch(createDocument({ doc: file, intl: intl }));
      expect(docs()[0].state).toEqual("failed-preparing");
      expect(docs()[0].message).toEqual("backend refused");
    });
  });

  describe("loadDocuments", () => {
    it("loads documents and templates from the db", async () => {
      await dbSaveDocument({ name: "a.pdf", state: "loaded" });
      await dbSaveDocument({ name: "b.pdf", state: "loading" });
      await dbSaveDocument({ name: "t.pdf", state: "loaded", isTemplate: true });
      await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
      expect(docs().length).toEqual(2);
      const byName = Object.fromEntries(docs().map((d) => [d.name, d]));
      expect(byName["a.pdf"].state).toEqual("loaded");
      // documents left "loading" from a previous session are failed
      expect(byName["b.pdf"].state).toEqual("failed-preparing");
      expect(byName["b.pdf"].message).toEqual(
        "There was a problem preparing the document",
      );
      const templates = store.getState().template.documents;
      expect(templates.length).toEqual(1);
      expect(templates[0].name).toEqual("t.pdf");
    });

    it("fails documents left signing when there is no sign response", async () => {
      await dbSaveDocument({ name: "s.pdf", state: "signing" });
      await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
      expect(docs()[0].state).toEqual("failed-signing");
      expect(docs()[0].message).toEqual(
        "There was a problem signing the document",
      );
    });

    it("fails invitations left signing when there is no sign response", async () => {
      seedMain(store, {
        pending_multisign: [{ name: "i.pdf", key: "I1", state: "loaded" }],
      });
      localStorage.setItem(
        storageName,
        JSON.stringify({
          invited: [{ key: "I1", state: "signing" }],
          owned: [],
        }),
      );
      await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
      const pending = store.getState().main.pending_multisign;
      expect(pending[0].state).toEqual("failed-signing");
      expect(pending[0].message).toEqual(
        "There was a problem signing the document",
      );
    });

    it("cleans up local storage when nothing is being signed", async () => {
      localStorage.setItem(
        storageName,
        JSON.stringify({ invited: [], owned: [] }),
      );
      await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
      expect(localStorage.getItem(storageName)).toEqual(null);
    });

    it("fetches signed documents when there is a sign response", async () => {
      await dbSaveDocument({
        name: "s.pdf",
        key: "S1",
        type: "application/pdf",
        state: "signing",
      });
      const dataElem = document.createElement("div");
      dataElem.id = "sign-response-holder";
      dataElem.dataset.signresponse = "dummy-sign-response";
      dataElem.dataset.relaystate = "dummy-relay-state";
      document.body.appendChild(dataElem);
      fetchMock.post("/sign/get-signed", {
        message: "documents signed",
        payload: {
          documents: [
            {
              id: "S1",
              signed_content: b64SamplePDFData,
              validated: true,
              pprinted: "pp",
            },
          ],
        },
      });
      try {
        await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
        expect(docs()[0].state).toEqual("signed");
        expect(docs()[0].signedContent).toEqual(
          "data:application/pdf;base64," + b64SamplePDFData,
        );
        expect(store.getState().notifications.message.message).toEqual(
          "documents signed",
        );
      } finally {
        document.body.removeChild(dataElem);
      }
    });

    it("fails signing documents when getting the signed content fails", async () => {
      await dbSaveDocument({
        name: "s.pdf",
        key: "S1",
        type: "application/pdf",
        state: "signing",
      });
      const dataElem = document.createElement("div");
      dataElem.id = "sign-response-holder";
      dataElem.dataset.signresponse = "dummy-sign-response";
      dataElem.dataset.relaystate = "dummy-relay-state";
      document.body.appendChild(dataElem);
      fetchMock.post("/sign/get-signed", {
        message: "signing failed",
        error: true,
      });
      try {
        await store.dispatch(loadDocuments({ eppn: eppn, intl: intl }));
        expect(docs()[0].state).toEqual("failed-signing");
        expect(docs()[0].message).toEqual("signing failed");
      } finally {
        document.body.removeChild(dataElem);
      }
    });

    it("returns no documents without an eppn", async () => {
      await store.dispatch(loadDocuments({ eppn: "", intl: intl }));
      expect(docs()).toEqual([]);
    });
  });

  describe("checkStoredDocuments", () => {
    it("updates failed invitations from local storage", async () => {
      seedMain(store, {
        owned_multisign: [{ name: "o.pdf", key: "O1", state: "signing" }],
        pending_multisign: [{ name: "i.pdf", key: "I1", state: "signing" }],
      });
      localStorage.setItem(
        storageName,
        JSON.stringify({
          owned: [
            { name: "o.pdf", key: "O1", state: "failed-signing", message: "m1" },
          ],
          invited: [{ key: "I1", state: "failed-signing", message: "m2" }],
        }),
      );
      await store.dispatch(checkStoredDocuments());
      const main = store.getState().main;
      expect(main.owned_multisign[0].state).toEqual("failed-signing");
      expect(main.owned_multisign[0].message).toEqual("m1");
      expect(main.pending_multisign[0].state).toEqual("failed-signing");
      expect(main.pending_multisign[0].message).toEqual("m2");
      expect(localStorage.getItem(storageName)).toEqual(null);
    });
  });

  describe("startSigningDocuments", () => {
    const signingDoc = (overrides = {}) =>
      sampleDoc({
        state: "signing",
        ref: "d-ref",
        sign_requirement: "d-sign-req",
        ...overrides,
      });

    it("updates the signing form on success", async () => {
      store.dispatch(addDocument(signingDoc()));
      store.dispatch(
        addDocument(
          signingDoc({
            name: "test.xml",
            key: "xml-key",
            type: "application/xml",
            blob: "data:application/xml;base64," + btoa("<a>hi</a>"),
          }),
        ),
      );
      fetchMock.post("/sign/create-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [{ name: "test.pdf", id: "dummy id" }],
        },
      });
      await store.dispatch(startSigningDocuments({ intl: intl }));
      const signingData = store.getState().main.signingData;
      expect(signingData.relay_state).toEqual("dummy relay state");
      expect(signingData.documents).toEqual(undefined);
    });

    it("restarts signing when a document misses its sign requirement", async () => {
      store.dispatch(addDocument(sampleDoc({ state: "signing" })));
      fetchMock.post("/sign/recreate-sign-request", {
        payload: { documents: [], failed: [] },
      });
      const result = await store.dispatch(
        startSigningDocuments({ intl: intl }),
      );
      expect(result.payload).toEqual(
        "Document test.pdf missing sign requirement",
      );
      expect(fetchMock.called("/sign/recreate-sign-request")).toEqual(true);
    });

    it("restarts signing when the preparation has expired", async () => {
      store.dispatch(addDocument(signingDoc()));
      fetchMock
        .post("/sign/create-sign-request", {
          message: "expired cache",
          error: true,
        })
        .post("/sign/recreate-sign-request", {
          payload: {
            relay_state: "restarted relay state",
            failed: [],
            documents: [{ name: "test.pdf", key: "dummy-key" }],
          },
        });
      const result = await store.dispatch(
        startSigningDocuments({ intl: intl }),
      );
      expect(result.payload).toEqual("Expired sign API cache");
      const signingData = store.getState().main.signingData;
      expect(signingData.relay_state).toEqual("restarted relay state");
    });

    it("fails the signing documents on an error from the backend", async () => {
      store.dispatch(addDocument(signingDoc()));
      fetchMock.post("/sign/create-sign-request", {
        message: "sign request refused",
        error: true,
      });
      await store.dispatch(startSigningDocuments({ intl: intl }));
      expect(docs()[0].state).toEqual("failed-signing");
      expect(docs()[0].message).toEqual(
        "There was a problem signing the document",
      );
      expect(store.getState().notifications.message.message).toEqual(
        "There was a problem signing the document",
      );
    });
  });

  describe("restartSigningDocuments", () => {
    beforeEach(() => {
      seedMain(store, {
        owned_multisign: [
          {
            name: "o.pdf",
            key: "O1",
            type: "application/pdf",
            size: 100,
            state: "signing",
          },
        ],
        pending_multisign: [
          {
            name: "i.pdf",
            key: "I1",
            invite_key: "ik1",
            type: "application/pdf",
            size: 100,
            state: "signing",
          },
        ],
      });
      store.dispatch(
        addDocument(sampleDoc({ name: "l.pdf", key: "L1", state: "signing" })),
      );
    });

    it("updates form and local storage on success, marking failures", async () => {
      fetchMock.post("/sign/recreate-sign-request", {
        payload: {
          relay_state: "restarted relay state",
          failed: [{ key: "L1", state: "failed-signing", message: "no luck" }],
          documents: [{ name: "o.pdf", key: "O1" }],
        },
      });
      await store.dispatch(restartSigningDocuments({ intl: intl }));
      expect(docs()[0].state).toEqual("failed-signing");
      expect(docs()[0].message).toEqual("no luck");
      const stored = JSON.parse(localStorage.getItem(storageName));
      expect(stored.owned[0].state).toEqual("signing");
      expect(stored.invited[0].state).toEqual("signing");
      const signingData = store.getState().main.signingData;
      expect(signingData.relay_state).toEqual("restarted relay state");
      localStorage.clear();
    });

    it("checks stored documents when nothing could be prepared", async () => {
      fetchMock.post("/sign/recreate-sign-request", {
        payload: {
          failed: [
            { key: "O1", state: "failed-signing", message: "owner fail" },
            { key: "I1", state: "failed-signing", message: "invited fail" },
            { key: "L1", state: "failed-signing", message: "local fail" },
          ],
          documents: [],
        },
      });
      await store.dispatch(restartSigningDocuments({ intl: intl }));
      const main = store.getState().main;
      expect(main.owned_multisign[0].state).toEqual("failed-signing");
      expect(main.owned_multisign[0].message).toEqual("owner fail");
      expect(main.pending_multisign[0].state).toEqual("failed-signing");
      expect(main.pending_multisign[0].message).toEqual("invited fail");
      expect(docs()[0].state).toEqual("failed-signing");
      expect(localStorage.getItem(storageName)).toEqual(null);
    });

    it("fails all signing documents on an error from the backend", async () => {
      fetchMock.post("/sign/recreate-sign-request", {
        message: "recreation refused",
        error: true,
      });
      await store.dispatch(restartSigningDocuments({ intl: intl }));
      expect(docs()[0].state).toEqual("failed-signing");
      const main = store.getState().main;
      expect(main.owned_multisign[0].state).toEqual("failed-signing");
      expect(main.pending_multisign[0].state).toEqual("failed-signing");
      expect(store.getState().notifications.message.message).toEqual(
        "There was a problem signing the document",
      );
    });
  });

  describe("startSigning and startSigningDoc", () => {
    it("startSigning signs selected local documents", async () => {
      store.dispatch(
        addDocument(
          sampleDoc({
            state: "selected",
            ref: "d-ref",
            sign_requirement: "d-sign-req",
          }),
        ),
      );
      fetchMock.post("/sign/create-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          documents: [{ name: "test.pdf", id: "dummy id" }],
        },
      });
      await store.dispatch(startSigning({ intl: intl }));
      expect(docs()[0].state).toEqual("signing");
      await until(
        () => store.getState().main.signingData.relay_state !== undefined,
      );
    });

    it("startSigning restarts signing for selected invitations", async () => {
      seedMain(store, {
        owned_multisign: [
          {
            name: "o.pdf",
            key: "O1",
            type: "application/pdf",
            size: 100,
            state: "selected",
          },
        ],
      });
      fetchMock.post("/sign/recreate-sign-request", {
        payload: {
          relay_state: "restarted relay state",
          failed: [],
          documents: [{ name: "o.pdf", key: "O1" }],
        },
      });
      await store.dispatch(startSigning({ intl: intl }));
      expect(store.getState().main.owned_multisign[0].state).toEqual("signing");
      await until(
        () => store.getState().main.signingData.relay_state !== undefined,
      );
      localStorage.clear();
    });

    it("startSigningDoc signs one local document", async () => {
      store.dispatch(
        addDocument(
          sampleDoc({
            state: "selected",
            ref: "d-ref",
            sign_requirement: "d-sign-req",
          }),
        ),
      );
      fetchMock.post("/sign/create-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          documents: [{ name: "test.pdf", id: "dummy id" }],
        },
      });
      await store.dispatch(
        startSigningDoc({ doc: { key: "dummy-key" }, intl: intl }),
      );
      expect(docs()[0].state).toEqual("signing");
      await until(
        () => store.getState().main.signingData.relay_state !== undefined,
      );
    });

    it("startSigningDoc signs one invitation to the user", async () => {
      seedMain(store, {
        pending_multisign: [
          {
            name: "i.pdf",
            key: "I1",
            invite_key: "ik1",
            type: "application/pdf",
            size: 100,
            state: "loaded",
          },
        ],
      });
      fetchMock.post("/sign/recreate-sign-request", {
        payload: {
          relay_state: "restarted relay state",
          failed: [],
          documents: [{ name: "i.pdf", key: "I1" }],
        },
      });
      await store.dispatch(
        startSigningDoc({ doc: { key: "I1", name: "i.pdf" }, intl: intl }),
      );
      expect(store.getState().main.pending_multisign[0].state).toEqual(
        "signing",
      );
      await until(
        () => store.getState().main.signingData.relay_state !== undefined,
      );
      localStorage.clear();
    });

    it("startSigningDoc notifies when the document is not found", async () => {
      await store.dispatch(
        startSigningDoc({ doc: { key: "no-such-key" }, intl: intl }),
      );
      await until(() => store.getState().notifications.message !== null);
      expect(store.getState().notifications.message.message).toEqual(
        "There was a problem signing the document",
      );
    });
  });

  describe("downloads", () => {
    it("downloadSigned hands the document to the user", async () => {
      const saveAs = jest.spyOn(FileSaver, "saveAs").mockImplementation(() => {});
      store.dispatch(
        addDocument(
          sampleDoc({ state: "signed", signedContent: samplePDFBlob }),
        ),
      );
      await store.dispatch(downloadSigned("test.pdf"));
      expect(saveAs.mock.calls.length).toEqual(1);
      expect(saveAs.mock.calls[0][1]).toEqual("test-signed.pdf");
    });

    it("downloadAllSigned hands a zip with all signed documents", async () => {
      const saveAs = jest.spyOn(FileSaver, "saveAs").mockImplementation(() => {});
      // the downloadAllSigned.fulfilled reducer logs to the console
      jest.spyOn(console, "log").mockImplementation(() => {});
      store.dispatch(
        addDocument(
          sampleDoc({ state: "signed", signedContent: samplePDFBlob }),
        ),
      );
      seedMain(store, {
        pending_multisign: [
          {
            name: "i.pdf",
            key: "I1",
            type: "application/pdf",
            state: "signed",
            signedContent: samplePDFBlob,
          },
        ],
      });
      await store.dispatch(downloadAllSigned({ intl: intl }));
      expect(saveAs.mock.calls.length).toEqual(1);
      expect(saveAs.mock.calls[0][1]).toEqual("signed.zip");
    });
  });

  describe("skipOwnedSignature", () => {
    it("moves the document from invitations to local documents", async () => {
      seedMain(store, {
        owned_multisign: [
          {
            name: "o.pdf",
            key: "O1",
            type: "application/pdf",
            state: "loaded",
            signed: [],
          },
        ],
      });
      fetchMock.post("/sign/skip-final-signature", {
        payload: {
          documents: [
            { id: "O1", signed_content: b64SamplePDFData, pprinted: "pp" },
          ],
        },
      });
      await store.dispatch(skipOwnedSignature({ doc: { key: "O1" }, intl: intl }));
      expect(store.getState().main.owned_multisign).toEqual([]);
      expect(docs()[0].state).toEqual("signed");
      expect(docs()[0].signedContent).toEqual(
        "data:application/pdf;base64," + b64SamplePDFData,
      );
    });

    it("notifies the user on failure", async () => {
      seedMain(store, {
        owned_multisign: [
          { name: "o.pdf", key: "O1", type: "application/pdf", state: "loaded" },
        ],
      });
      fetchMock.post("/sign/skip-final-signature", {
        message: "cannot skip",
        error: true,
      });
      await store.dispatch(skipOwnedSignature({ doc: { key: "O1" }, intl: intl }));
      expect(store.getState().main.owned_multisign.length).toEqual(1);
      expect(store.getState().notifications.message.message).toEqual(
        "Problem skipping final signature, please try again",
      );
    });
  });

  describe("saveDocument and removeDocument", () => {
    it("saveDocument persists the document to the db", async () => {
      store.dispatch(addDocument(sampleDoc({ state: "loaded" })));
      await store.dispatch(saveDocument({ docKey: "dummy-key" }));
      const saved = await readDb();
      expect(saved.length).toEqual(1);
      expect(saved[0].name).toEqual("test.pdf");
    });

    it("removeDocument removes from the store and the db", async () => {
      await dbSaveDocument({ name: "a.pdf", id: 1, state: "loaded" });
      store.dispatch(addDocument({ name: "a.pdf", id: 1, state: "loaded" }));
      await store.dispatch(removeDocument({ docName: "a.pdf" }));
      expect(docs()).toEqual([]);
      const saved = await readDb();
      expect(saved).toEqual([]);
    });

    it("removeDocument removes an unpersisted document from the store", async () => {
      store.dispatch(addDocument(sampleDoc({ state: "loaded" })));
      await store.dispatch(removeDocument({ docName: "test.pdf" }));
      expect(docs()).toEqual([]);
    });
  });
});
