/**
 * @module entry-points/index
 * @desc Main entry point for webpack to build the bundle.
 *
 * Here we load some polyfills, set the src for the pdfjs worker,
 * and call [init_app]{@linkcode module:init-app/init-app~init_app}
 * with a [Main]{@linkcode module:components/Main.Main} React Component.
 */

import React from "react";

// PDF.js worker

import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.js";

// End of PDF.js worker

if (!Element.prototype.matches)
  Element.prototype.matches =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;

// Polyfill for Element.closest for IE9+
// see https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

if (!Element.prototype.closest)
  Element.prototype.closest = function (s) {
    let el = this;
    if (!document.documentElement.contains(el)) return null;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null);
    return null;
  };

// end Polyfill

import Main from "containers/Main";
import init_app from "init-app/init-app";

init_app(document.getElementById("root"), <Main />);
