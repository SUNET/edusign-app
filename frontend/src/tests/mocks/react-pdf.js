/**
 * Jest replacement for react-pdf.
 *
 * The pdfjs export is the real pdfjs (legacy build, fake worker): the tests
 * feed real base64 PDF fixtures through slices/Documents.js validateDoc,
 * including a password-protected one, so PDF parsing must actually happen.
 *
 * Document and Page replace react-pdf's components, which cannot render in
 * jsdom (no canvas). Document really loads the file with pdfjs and calls
 * onLoadSuccess/onLoadError; Page renders the text content of its page, so
 * tests can assert on the PDF's text just as they did on the text layer in
 * real Chrome.
 */

const React = require("react");
const realPdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");

// No worker in jsdom: pdfjs falls back to its fake worker. Preloading the
// worker module on globalThis makes pdfjs use it directly, instead of
// reaching it through a dynamic import that hangs under jest.
globalThis.pdfjsWorker = require("pdfjs-dist/legacy/build/pdf.worker.mjs");

/**
 * The app loads PDFs from data: URLs ({url: doc.blob}); in jsdom pdfjs's
 * XHR-based network stream cannot read them. Decoding the data: URL to bytes
 * here makes pdfjs skip the network layer altogether.
 */
const decodeDataUrl = (url) => {
  const b64 = url.slice(url.indexOf(",") + 1);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// jsdom's Blob has no arrayBuffer(); FileReader is implemented.
const blobToBytes = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

// verbosity 0 (errors only): the sample PDFs make pdfjs log warnings like
// "Indexing all PDF objects", which clutter the test output.
const getDocument = (src) => {
  if (
    src !== null &&
    typeof src === "object" &&
    typeof src.url === "string" &&
    src.url.startsWith("data:")
  ) {
    const { url, ...rest } = src;
    return realPdfjs.getDocument({
      verbosity: 0,
      ...rest,
      data: decodeDataUrl(url),
    });
  }
  if (src !== null && typeof src === "object" && !ArrayBuffer.isView(src)) {
    return realPdfjs.getDocument({ verbosity: 0, ...src });
  }
  return realPdfjs.getDocument(src);
};

const pdfjs = Object.create(realPdfjs, {
  getDocument: { value: getDocument, enumerable: true },
});

const DocumentContext = React.createContext(null);

function Document(props) {
  const { file, onLoadSuccess, onLoadError, children } = props;
  const [pdf, setPdf] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        let source;
        if (file instanceof Blob) {
          source = { data: await blobToBytes(file) };
        } else if (typeof file === "string") {
          source = { url: file };
        } else {
          source = file;
        }
        const doc = await pdfjs.getDocument(source).promise;
        if (cancelled) return;
        setPdf(doc);
        if (onLoadSuccess) onLoadSuccess(doc);
      } catch (err) {
        if (!cancelled && onLoadError) onLoadError(err);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (pdf === null) return null;

  return React.createElement(
    DocumentContext.Provider,
    { value: pdf },
    children,
  );
}

function Page(props) {
  const pdf = React.useContext(DocumentContext);
  // Track which page the text belongs to: like react-pdf's text layer, the
  // text of the previous page must disappear as soon as pageNumber changes.
  const [loaded, setLoaded] = React.useState({ pageNumber: null, text: null });

  React.useEffect(() => {
    let cancelled = false;

    if (pdf === null) return undefined;
    pdf
      .getPage(props.pageNumber)
      .then((page) => page.getTextContent())
      .then((content) => {
        if (cancelled) return;
        setLoaded({
          pageNumber: props.pageNumber,
          text: content.items.map((item) => item.str).join(" "),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pdf, props.pageNumber]);

  const text = loaded.pageNumber === props.pageNumber ? loaded.text : null;

  return React.createElement(
    "div",
    { className: "react-pdf__Page", "data-page-number": props.pageNumber },
    text === null ? null : React.createElement("span", null, text),
  );
}

module.exports = { pdfjs, Document, Page };
