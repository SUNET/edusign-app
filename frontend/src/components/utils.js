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
  sliceSize = 512
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
 * @function preparePDF
 * @desc Prepare PDF data for react-pdf's Document
 *
 */
export const preparePDF = (doc) => {
  return docToFile(doc);
};
export const preparePDF1 = (doc) => {
  return { url: doc.blob };
};
export const preparePDF2 = (doc) => {
  const byteCharacters = atob(doc.blob.split(",")[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  return { data: new Uint8Array(byteNumbers) };
};
export const preparePDF3 = (doc) => {
  return { data: atob(doc.blob.split(",")[1]) };
};

//
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
  let newFile = null;
  try {
    const fileContents = b64toBlob(doc.blob.split(",")[1], doc.type);
    newFile = new File([fileContents], doc.name, {
      type: doc.type,
    });
    return newFile;
  } catch (err) {
    return null;
  }
}

/**
 * @public
 * @function hashCode
 * @desc Hash string
 *
 */
export const hashCode = function (s) {
  var hash = 0,
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
