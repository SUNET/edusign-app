// Polyfills that must be in place before any module is loaded.
// jsdom lacks fetch, TextEncoder/TextDecoder and structuredClone.

const { TextEncoder, TextDecoder } = require("node:util");

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = require("node:v8").deserialize
    ? (val) => require("node:v8").deserialize(require("node:v8").serialize(val))
    : (val) => JSON.parse(JSON.stringify(val));
}

// fetch, Request, Response, Headers for jsdom; fetch-mock wraps this fetch.
require("whatwg-fetch");

// Needed by pdfjs-dist >= 4.3 on node 20 (Promise.withResolvers is node >= 22).
if (typeof Promise.withResolvers === "undefined") {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// jsdom does not implement createObjectURL.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:jest-mock";
  URL.revokeObjectURL = () => {};
}

// jsdom does not implement scrolling; slices/Notifications.js calls
// window.scrollTo and slices/Documents.js calls Element.scrollIntoView.
window.scrollTo = () => {};
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
