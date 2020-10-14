import React from "react";

if (!Element.prototype.matches)
  Element.prototype.matches =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;

// Polyfill for Element.closest for IE9+
// see https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

if (!Element.prototype.closest)
  Element.prototype.closest = function (s) {
    var el = this;
    if (!document.documentElement.contains(el)) return null;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null);
    return null;
  };

// end Polyfill

// PDF.js worker

import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/front-build/pdf.worker.js";

// End of PDF.js worker

import Main from "components/Main";
import init_app from "init-app/init-app";

init_app(document.getElementById("root"), <Main />);
