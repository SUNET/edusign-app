//  from https://github.com/lelandrichardson/enzyme-example-karma-webpack/raw/master/test/.setup.js
//  see  https://github.com/airbnb/enzyme/blob/master/docs/guides/jsdom.md

var chai = require("chai");
chai.use(require("chai-dom"));

import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

var context = require.context(".", true, /-test\.js$/); //make sure you have your directory and regex test set correctly!
context.keys().forEach(context);
