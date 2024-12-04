import React, { useMemo } from "react";

import { FormattedMessage } from "react-intl";

/**
 * @module components/utils
 * @desc Utility functions used in the components.
 */

/**
 * @public
 * @function b64toBlob
 * @desc Create a Blob object from a base64 string
 *
 * Obtained from [this stackoverflow question]{https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript}
 */
export const b64toBlob = (
  b64Data,
  contentType = "application/pdf",
  sliceSize = 512,
) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

/**
 * @public
 * @function humanFileSize
 * @desc Convert file size from number of bytes (int) to human readable string
 *
 * Obtained from [this stackoverflow question]{https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string}
 */
export function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

/**
 * @public
 * @function docToFile
 * @desc Convert object containing a document's data and metadata to a File object.
 *
 */
export function docToFile(doc) {
  if (doc.blob === undefined) {
    return undefined;
  }
  let newFile = null;
  try {
    const fileContents = b64toBlob(doc.blob.split(",")[1], doc.type);
    newFile = new File([fileContents], doc.name, {
      type: doc.type,
    });
    return newFile;
  } catch (err) {
    return newFile;
  }
}

/**
 * @public
 * @function hashCode
 * @desc Hash string
 *
 */
export const hashCode = function (s) {
  let hash = 0,
    i,
    chr;
  if (s.length === 0) return hash;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

/**
 * @public
 * @function preparePrevSig
 * @desc Prepare previous signature for display
 *
 */
export const preparePrevSigs = (doc, size) => {
  if (doc.prev_signatures === undefined || doc.prev_signatures === null)
    return "";
  if (doc.prev_signatures === "pdf read error") {
    return (
      <div className={"doc-container-info-row-" + size} key="-1">
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Previously signed by:"
            key="multisign-owned-prev-signed"
          />
        </span>
        <span className="info-row-items">
          <span className="info-row-item">
            <FormattedMessage
              defaultMessage="Unable to interpret document metadata"
              key="multisign-owned-prev-signed-pdf-error"
            />
          </span>
        </span>
      </div>
    );
  }
  try {
    const sigStrs = doc.prev_signatures
      .split("|")
      .filter((sig) => sig.length > 0);
    let signatures;
    if (doc.type === "application/pdf") {
      signatures = getPDFSignatures(sigStrs);
    } else {
      signatures = getXMLSignatures(sigStrs);
    }
    const sigElems = signatures.map((sig, i) => {
      return (
        <span className="info-row-item" title={sig.alt} key={i}>
          {sig.mainVal}
          {i < sigStrs.length - 1 ? "," : "."}
        </span>
      );
    });
    return (
      (doc.prev_signatures && doc.prev_signatures.length > 0 && (
        <div className={"doc-container-info-row-" + size} key="-1">
          <span className="info-row-label">
            <FormattedMessage
              defaultMessage="Previously signed by:"
              key="multisign-owned-prev-signed"
            />
          </span>
          <span className="info-row-items">{sigElems}</span>
        </div>
      )) ||
      ""
    );
  } catch (err) {
    return (
      <div className={"doc-container-info-row-" + size} key="-1">
        <span className="info-row-label">
          <FormattedMessage
            defaultMessage="Previously signed by:"
            key="multisign-owned-prev-signed"
          />
        </span>
        <span className="info-row-items">
          <span className="info-row-item">
            <FormattedMessage
              defaultMessage="Unknown"
              key="multisign-owned-prev-signed-unknown"
            />
          </span>
        </span>
      </div>
    );
  }
};

const getPDFSignatures = (sigStrs) => {
  return sigStrs.map((sigStr) => {
    let sigArr;
    if (sigStr.includes(";")) {
      sigArr = sigStr.split(";");
    } else {
      sigArr = sigStr.split(",");
    }
    let sig = {};
    sigArr.forEach((segment) => {
      const [k, v] = segment.split(":");
      sig[k.trim()] = v.trim();
    });
    let mainVal = "";
    if (sig.hasOwnProperty("Common Name")) {
      mainVal = sig["Common Name"];
      delete sig["Common Name"];
    } else if (
      sig.hasOwnProperty("Given Name") &&
      sig.hasOwnProperty("Surname")
    ) {
      mainVal = `${sig["Given Name"]} ${sig["Surname"]}`;
      delete sig["Given Name"];
      delete sig["Surname"];
    } else {
      mainVal = sig["Serial Number"];
      delete sig["Serial Number"];
    }
    let alt = Object.keys(sig)
      .map((key) => {
        return `${key}: ${sig[key]}`;
      })
      .join("; ");
    return {
      mainVal: mainVal,
      alt: alt,
    };
  });
};

const getXMLSignatures = (sigStrs) => {
  const sigs = [];
  sigStrs.forEach((sigStr) => {
    let sigArr;
    if (sigStr.includes(";")) {
      sigArr = sigStr.split(";");
    } else {
      sigArr = sigStr.split(",");
    }
    let sig = {};
    sigArr.forEach((segment) => {
      const [k, v] = segment.split("=");
      sig[k.trim()] = v.trim();
    });
    let mainVal = "";
    if (sig.hasOwnProperty("2.5.4.42") && sig.hasOwnProperty("2.5.4.4")) {
      mainVal = `${sig["2.5.4.42"]} ${sig["2.5.4.4"]}`;
    }
    if (mainVal) {
      let alt = Object.keys(sig)
        .map((key) => {
          return `${key}=${sig[key]}`;
        })
        .join("; ");
      sigs.push({
        mainVal: mainVal,
        alt: alt,
      });
    }
  });
  return sigs;
};

/**
 * @public
 * @function nameForCopy
 * @desc Create name for copy of document to sign
 *
 */
export const nameForCopy = (props) => {
  let tmpName = props.docName;
  let ext = "";
  if (tmpName.includes(".")) {
    const split = tmpName.split(".");
    tmpName = split.slice(0, -1).join(".");
    ext = split[split.length - 1];
  }
  let newName;
  let suffix = 1;
  let nameOk = false;
  while (!nameOk) {
    newName = `${tmpName}-${suffix}`;
    if (ext !== "") {
      newName = `${newName}.${ext}`;
    }
    nameOk = true;
    [props.templates, props.documents, props.owned].forEach((coll) => {
      coll.forEach((doc) => {
        if (doc.name === newName) {
          nameOk = false;
          suffix += 1;
        }
      });
    });
  }
  return newName;
};
/**
 * @public
 * @function nameForDownload
 * @desc Create name for signed document download
 *
 */
export const nameForDownload = (name, suffix, state = null) => {
  let tmpName = name;
  let ext = "";
  if (tmpName.includes(".")) {
    const split = tmpName.split(".");
    tmpName = split.slice(0, -1).join(".");
    ext = split[split.length - 1];
  }
  if (ext !== "") {
    tmpName = `${tmpName}-${suffix}.${ext}`;
  } else {
    tmpName = `${tmpName}-${suffix}`;
  }
  let number = 0;
  if (state !== null) {
    const docCollections = [state.template.documents, state.documents.documents, state.main.owned_multisign, state.main.pending_multisign];
    let finished = false;
    while (!finished) {
      finished = true;
      for (const docs of docCollections) {
        let found = false;
        if (docs) {
          for (const doc of docs) {
            if (doc.name === tmpName) {
              found = true;
              finished = false;
              number++;
              if (ext !== "") {
                tmpName = `${tmpName}-${suffix}-${number}.${ext}`;
              } else {
                tmpName = `${tmpName}-${suffix}-${number}`;
              }
              break;
            }
          }
        }
        if (found) {
          break;
        }
      }
    }
  }
  return tmpName;
};

/**
 * @public
 * @function getCreationDate
 * @desc Creation name for provided document
 *
 */

export const getCreationDate = (doc) => {
  let ts = Number(doc.created);
  if (isNaN(ts)) {
    ts = Date.parse(doc.created);
  }
  let creationDate = null;
  if (!isNaN(ts)) {
    creationDate = new Date(ts);
  }
  return creationDate;
};

export const getOrdinal = (lang, num) => {
  const ordinalRules = new Intl.PluralRules(lang, { type: "ordinal" });
  const formatOrdinals = (n, suffixes) => {
    const rule = ordinalRules.select(n);
    const suffix = suffixes.get(rule);
    return `${n}${suffix}`;
  };
  let suffixes;

  if (lang.startsWith("en")) {
    suffixes = new Map([
      ["one", "st"],
      ["two", "nd"],
      ["few", "rd"],
      ["other", "th"],
    ]);
  } else if (lang.startsWith("sv")) {
    suffixes = new Map([
      ["one", ":a"],
      ["other", ":e"],
    ]);
  } else {
    suffixes = new Map([
      ["one", "ª"],
      ["two", "ª"],
      ["few", "ª"],
      ["other", "ª"],
    ]);
  }
  return formatOrdinals(num, suffixes);
};
