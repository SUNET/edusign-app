/**
 * @module init-app/database
 * @desc Here we create the IndexedDB db that will persst the documents n the session between sessions
 */

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

const documentDo = (action, document) => {
  if (db !== null) {
    const transaction = db.transaction(["documents"], "readwrite");
    transaction.onerror = (event) => {
      console.log("cannot create a db transaction", event);
    };
    const docStore = transaction.objectStore("documents");
    let docRequest = null;
    if (action === "saving") {
      console.log("saving document to db", document.name);
      docRequest = docStore.put(document);
    } else if (action === "removing") {
      console.log("removing document from db", document.name);
      docRequest = docStore.delete(document.name);
    }
    docRequest.onerror = (event) => {
      console.log("Problem saving document", document.name, "Error:", event);
    };
  } else {
    console.log("Cannot save the state, db absent");
  }
};

export const dbSaveDocument = (document) => {
  documentDo("saving", document);
};

export const dbRemoveDocument = (document) => {
  documentDo("removing", document);
};
