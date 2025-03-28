/**
 * @module init-app/database
 * @desc Here we create the IndexedDB db that will persist the loaded documents between sessions
 */
import { addNotification, rmNotification } from "slices/Notifications";
import { hashCode } from "components/utils";

let db = null;

async function _getDb(name) {
  const promisedDb = await new Promise((resolve) => {
    const request = indexedDB.open(name, 1);
    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };
    request.onerror = (event) => {
      resolve(null);
    };
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        db.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      event.target.transaction.oncomplete = () => {
        resolve(db);
      };
    };
  });
  return promisedDb;
}
async function getNewDb(name) {
  const newname = "eduSignDB-" + hashCode(name);
  return _getDb(newname);
}
async function getOldDb() {
  return _getDb("eduSignDB");
}

/**
 * @public
 * @function getDb
 * @desc Get or create the IndexedDB db to hold documents loaded to the app.
 *
 * XXX NOTE most of this code should be removed afrter a transition period,
 * once noone has an old named db.
 *
 */
export async function getDb(name) {
  if (!name)
    return null;
  if (db === null) {
    const olddb = await getOldDb();
    db = await getNewDb(name);

    const oldTransaction = olddb.transaction(["documents"], "readwrite");
    oldTransaction.onerror = (event) => {};
    const oldStore = oldTransaction.objectStore("documents");

    await new Promise((resolve) => {
      oldStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const document = cursor.value;

          const newTransaction = db.transaction(["documents"], "readwrite");
          newTransaction.onerror = (event) => {};
          const newStore = newTransaction.objectStore("documents");

          const docRequest = newStore.add(document);
          docRequest.onerror = (event) => {
            console.log("error recovering document, ", event);
          };

          cursor.continue();
        }
        if (cursor === null) {
          const docRequest = oldStore.clear();
          docRequest.onsuccess = (e) => {
            resolve();
          };
        }
      };
    });
    return db;
  } else {
    return db;
  }
}

/**
 * @public
 * @function resetDb
 * @desc Reset the IndexedDB - for testing.
 *
 */
export async function resetDb() {
  require("fake-indexeddb/auto");
  const FDBFactory = require("fake-indexeddb/lib/FDBFactory");
  return new Promise((resolve) => {
    const iDB = new FDBFactory();
    const request = iDB.open("eduSignDB", 1);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = (event) => {
      resolve(null);
    };
    request.onupgradeneeded = (event) => {
      db = request.result;
      if (event.oldVersion < 1) {
        db.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      event.target.transaction.oncomplete = () => {
        resolve(db);
      };
    };
  });
}

/**
 * @function getDocStore
 * @desc Get the documents table from the db, or null if there's no db.
 *
 */
const getDocStore = () => {
  if (db !== null) {
    const transaction = db.transaction(["documents"], "readwrite");
    transaction.onerror = (event) => {};
    return transaction.objectStore("documents");
  } else {
    return null;
  }
};

/**
 * @function documentDo
 * @desc Save or remove some document from the db.
 *
 */
const documentDo = async (action, doc) => {
  if (db !== null) {
    const transaction = db.transaction(["documents"], "readwrite");
    const docStore = transaction.objectStore("documents");

    await new Promise((resolve, reject) => {
      let docRequest = null;
      if (action === "saving") {
        docRequest = docStore.put(doc);
      } else if (action === "removing") {
        docRequest = docStore.delete(doc.id);
      }
      transaction.oncomplete = () => {
        resolve();
      };
      docRequest.onerror = () => {
        reject(docRequest.error);
      };
    });
  }
};

/**
 * @public
 * @function dbSaveDocument
 * @desc Save document to the IndexedDB db.
 *
 */
export const dbSaveDocument = async (doc) => {
  await documentDo("saving", doc);
};

/**
 * @public
 * @function dbRemoveDocument
 * @desc Remove document from the IndexedDB db.
 *
 */
export const dbRemoveDocument = async (doc) => {
  await documentDo("removing", doc);
};

/**
 * @public
 * @function clearDocStore
 * @desc Remove all documents from the IndexedDB db.
 *
 */
export const clearDocStore = (dispatch, intl) => {
  const docStore = getDocStore();
  if (docStore !== null) {
    const docRequest = docStore.clear();
    docRequest.onsuccess = (e) => {
      dispatch(rmNotification());
    };
    docRequest.onerror = (event) => {
      dispatch(
        addNotification({
          level: "danger",
          message: intl.formatMessage({
            defaultMessage: "problem clearing db, please try again",
            id: "problem-clearing-db",
          }),
        }),
      );
    };
  } else {
    dispatch(
      addNotification({
        level: "danger",
        message: intl.formatMessage({
          defaultMessage: "no persistent state",
          id: "no-persistent-state",
        }),
      }),
    );
  }
};
