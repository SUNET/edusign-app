/**
 * @module init-app/database
 * @desc Here we create the IndexedDB db that will persist the loaded documents between sessions
 */
import { addNotification, rmNotification } from "slices/Notifications";

let db = null;

/**
 * @public
 * @function getDb
 * @desc Get or create the IndexedDB db to hold documents loaded to the app.
 *
 */
export async function getDb() {
  if (db === null) {
    const promisedDb = await new Promise((resolve) => {
      const request = indexedDB.open("eduSignDB", 1);
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
    return promisedDb;
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
  return await new Promise((resolve) => {
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
const documentDo = (action, document) => {
  const docStore = getDocStore();
  if (docStore !== null) {
    let docRequest = null;
    if (action === "saving") {
      docRequest = docStore.put(document);
    } else if (action === "removing") {
      docRequest = docStore.delete(document.id);
    }
    docRequest.onerror = (event) => {};
  } else {
  }
};

/**
 * @public
 * @function dbSaveDocument
 * @desc Save document to the IndexedDB db.
 *
 */
export const dbSaveDocument = (document) => {
  documentDo("saving", document);
};

/**
 * @public
 * @function dbRemoveDocument
 * @desc Remove document from the IndexedDB db.
 *
 */
export const dbRemoveDocument = (document) => {
  documentDo("removing", document);
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
    docRequest.onsuccess = (e) => {dispatch(rmNotification())};
    docRequest.onerror = (event) => {
      dispatch(
        addNotification({
          level: "danger",
          message: intl.formatMessage({defaultMessage: "problem clearing db, please try again", id: "problem-clearing-db"}),
        })
      );
    };
  } else {
    dispatch(
      addNotification({ level: "danger", message: intl.formatMessage({defaultMessage: "no persistent state", id: "no-persistent-state"}) })
    );
  }
};
