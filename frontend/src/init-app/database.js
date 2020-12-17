/**
 * @module init-app/database
 * @desc Here we create the IndexedDB db that will persst the documents n the session between sessions
 */

import { addNotification } from "slices/Notifications";

let db = null;

export function getDb() {
  if (db === null) {
    const promisedDb = new Promise((resolve, reject) => {
      const request = indexedDB.open("eduSignDB", 1);
      request.onsuccess = (event) => {
        console.log("Loaded db from disk");
        const newdb = event.target.result;
        db = newdb;
        resolve(newdb);
      };
      request.onerror = (event) => {
        console.log("Problem opening eduSign db", event);
        reject("Problem opening eduSign db");
      };
      request.onupgradeneeded = (event) => {
        const newdb = event.target.result;
        db = newdb;
        const docStore = db.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
        resolve(newdb);
      };
    });
    return promisedDb;
  } else {
    return db;
  }
}

const getDocStore = () => {
  if (db !== null) {
    const transaction = db.transaction(["documents"], "readwrite");
    transaction.onerror = (event) => {
      console.log("cannot create a db transaction", event);
    };
    return transaction.objectStore("documents");
  } else {
    console.log("No persistent state, db absent");
    return null;
  }
};

const documentDo = (action, document) => {
  const docStore = getDocStore();
  if (docStore !== null) {
    let docRequest = null;
    if (action === "saving") {
      console.log("saving document to db", document.name);
      docRequest = docStore.put(document);
    } else if (action === "removing") {
      console.log("removing document from db", document.name);
      docRequest = docStore.delete(document.name);
    }
    docRequest.onerror = (event) => {
      console.log(`Problem {action} document`, document.name, "Error:", event);
    };
  } else {
    console.log(`Problem {action} document, db absent`);
  }
};

export const dbSaveDocument = (document) => {
  documentDo("saving", document);
};

export const dbRemoveDocument = (document) => {
  documentDo("removing", document);
};

export const clearDocStore = (dispatch) => {
  const docStore = getDocStore();
  if (docStore !== null) {
    console.log("clearing the db");
    const docRequest = docStore.clear();
    docRequest.onerror = (event) => {
      console.log("Problem clearing the db", "Error:", event);
      dispatch(addNotification({level: 'danger', message: 'XXX problem clearing db, please try again'}));
    };
  } else {
    console.log("Problem clearing the state, db absent");
    dispatch(addNotification({level: 'danger', message: 'XXX no persistent state'}));
  }
};
