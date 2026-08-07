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

// pdfjs-dist 5 references DOMMatrix and Path2D at module scope; jsdom
// implements neither. The tests only parse PDFs and extract text, which
// does not touch matrix math or path drawing, so inert stubs suffice.
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
    }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D {};
}

// pdfjs-dist 5's getTextContent returns a ReadableStream; node has the web
// streams, but jest's jsdom environment does not expose them as globals.
if (typeof globalThis.ReadableStream === "undefined") {
  const streams = require("node:stream/web");
  globalThis.ReadableStream = streams.ReadableStream;
  globalThis.WritableStream = streams.WritableStream;
  globalThis.TransformStream = streams.TransformStream;
}

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
