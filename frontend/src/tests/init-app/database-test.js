/**
 * Tests for the IndexedDB wrapper in init-app/database.
 *
 * fake-indexeddb provides the indexedDB global (resetDb requires it, and
 * this suite requires it in beforeEach). The module keeps its db handle in
 * module state, so each test re-requires a fresh copy of the module.
 */
import { hashCode } from "components/utils";
import { rmNotification } from "slices/Notifications";

describe("init-app/database", () => {
  let database;

  beforeEach(() => {
    jest.resetModules();
    require("fake-indexeddb/auto");
    database = require("init-app/database");
  });

  // fake-indexeddb runs its callbacks asynchronously
  const flush = () => new Promise((resolve) => setTimeout(resolve, 25));

  const allDocs = (db) =>
    new Promise((resolve, reject) => {
      const request = db
        .transaction(["documents"], "readonly")
        .objectStore("documents")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const populateOldDb = (docs) =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open("eduSignDB", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["documents"], "readwrite");
        const store = transaction.objectStore("documents");
        docs.forEach((doc) => store.add(doc));
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });

  it("getDb without a name gives null", async () => {
    expect(await database.getDb()).toEqual(null);
    expect(await database.getDb("")).toEqual(null);
  });

  it("getDb migrates documents from the old database", async () => {
    await populateOldDb([{ name: "old.pdf", blob: "data:,old" }]);

    const db = await database.getDb("tester@example.org");
    expect(db.name).toEqual("eduSignDB-" + hashCode("tester@example.org"));
    await flush();

    const docs = await allDocs(db);
    expect(docs.length).toEqual(1);
    expect(docs[0].name).toEqual("old.pdf");
    expect(docs[0].blob).toEqual("data:,old");

    // the old database has been emptied
    const old = await new Promise((resolve) => {
      const request = indexedDB.open("eduSignDB", 1);
      request.onsuccess = () => resolve(request.result);
    });
    expect(await allDocs(old)).toEqual([]);
    old.close();
  });

  it("getDb returns the cached db on later calls", async () => {
    const db1 = await database.getDb("tester@example.org");
    const db2 = await database.getDb("other@example.org");
    expect(db2).toBe(db1);
  });

  it("resetDb gives a fresh empty database", async () => {
    const db = await database.resetDb();
    await database.dbSaveDocument({ name: "a.pdf" });
    expect((await allDocs(db)).length).toEqual(1);

    const db2 = await database.resetDb();
    expect(await allDocs(db2)).toEqual([]);
  });

  it("saves, updates and removes documents", async () => {
    const db = await database.resetDb();

    await database.dbSaveDocument({ name: "a.pdf", blob: "data:,a" });
    let docs = await allDocs(db);
    expect(docs).toEqual([{ id: 1, name: "a.pdf", blob: "data:,a" }]);

    await database.dbSaveDocument({ id: 1, name: "a.pdf", blob: "data:,b" });
    docs = await allDocs(db);
    expect(docs).toEqual([{ id: 1, name: "a.pdf", blob: "data:,b" }]);

    await database.dbSaveDocument({ name: "b.pdf", blob: "data:,c" });
    docs = await allDocs(db);
    expect(docs.length).toEqual(2);

    await database.dbRemoveDocument({ id: 1 });
    docs = await allDocs(db);
    expect(docs).toEqual([{ id: 2, name: "b.pdf", blob: "data:,c" }]);
  });

  it("saving and removing without a db are no-ops", async () => {
    await database.dbSaveDocument({ name: "a.pdf" });
    await database.dbRemoveDocument({ id: 1 });
  });

  it("clearDocStore empties the store and clears the notification", async () => {
    const db = await database.resetDb();
    await database.dbSaveDocument({ name: "a.pdf" });
    await database.dbSaveDocument({ name: "b.pdf" });

    const dispatch = jest.fn();
    const intl = {
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    };
    database.clearDocStore(dispatch, intl);
    await flush();

    expect(await allDocs(db)).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith(rmNotification());
  });

  it("clearDocStore without a db notifies danger", () => {
    const dispatch = jest.fn();
    const intl = {
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    };
    database.clearDocStore(dispatch, intl);

    expect(intl.formatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "no-persistent-state" }),
    );
    // addNotification is an async thunk: dispatch receives a function
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(typeof dispatch.mock.calls[0][0]).toEqual("function");
  });
});
