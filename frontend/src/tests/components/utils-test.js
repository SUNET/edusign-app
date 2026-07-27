import React from "react";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";

import {
  b64toBlob,
  humanFileSize,
  docToFile,
  hashCode,
  preparePrevSigs,
  nameForCopy,
  nameForDownload,
  getCreationDate,
  getOrdinal,
  getInviteKey,
  getConfigPath,
} from "components/utils";
import { b64SamplePDFData, samplePDFData } from "tests/test-utils";

// jsdom's Blob has no text()/arrayBuffer(); FileReader is implemented.
const blobToText = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe("b64toBlob", () => {
  it("decodes base64 to a Blob with the default type", async () => {
    const blob = b64toBlob(btoa("hello world"));
    expect(blob.type).toEqual("application/pdf");
    expect(blob.size).toEqual(11);
    expect(await blobToText(blob)).toEqual("hello world");
  });

  it("takes a content type", () => {
    const blob = b64toBlob(btoa("hello"), "text/plain");
    expect(blob.type).toEqual("text/plain");
  });

  it("decodes content larger than the slice size", async () => {
    const blob = b64toBlob(btoa("hello world"), "text/plain", 4);
    expect(await blobToText(blob)).toEqual("hello world");
  });

  it("decodes the empty string", () => {
    expect(b64toBlob("").size).toEqual(0);
  });
});

describe("humanFileSize", () => {
  it("keeps sizes under the threshold in bytes", () => {
    expect(humanFileSize(0)).toEqual("0 B");
    expect(humanFileSize(500)).toEqual("500 B");
    expect(humanFileSize(1023)).toEqual("1023 B");
    expect(humanFileSize(999, true)).toEqual("999 B");
  });

  it("converts to binary units by default", () => {
    expect(humanFileSize(1024)).toEqual("1.0 KiB");
    expect(humanFileSize(1536)).toEqual("1.5 KiB");
    expect(humanFileSize(1024 ** 3)).toEqual("1.0 GiB");
  });

  it("converts to SI units when asked", () => {
    expect(humanFileSize(1000, true)).toEqual("1.0 kB");
    expect(humanFileSize(1500000, true)).toEqual("1.5 MB");
  });

  it("respects the decimal places argument", () => {
    expect(humanFileSize(1536, false, 2)).toEqual("1.50 KiB");
    expect(humanFileSize(1536, false, 0)).toEqual("2 KiB");
  });

  it("moves to the next unit when rounding reaches the threshold", () => {
    expect(humanFileSize(1048575)).toEqual("1.0 MiB");
  });

  it("handles negative sizes", () => {
    expect(humanFileSize(-500)).toEqual("-500 B");
    expect(humanFileSize(-2048)).toEqual("-2.0 KiB");
  });
});

describe("docToFile", () => {
  it("converts a document object to a File", () => {
    const doc = {
      name: "test.pdf",
      type: "application/pdf",
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    const file = docToFile(doc);
    expect(file).toBeInstanceOf(File);
    expect(file.name).toEqual("test.pdf");
    expect(file.type).toEqual("application/pdf");
    expect(file.size).toEqual(samplePDFData.length);
  });

  it("returns undefined without a blob", () => {
    expect(docToFile({ name: "test.pdf" })).toEqual(undefined);
  });

  it("returns null for undecodable data", () => {
    const doc = {
      name: "test.pdf",
      type: "application/pdf",
      blob: "data:application/pdf;base64,!!!",
    };
    expect(docToFile(doc)).toEqual(null);
  });
});

describe("hashCode", () => {
  it("hashes strings deterministically", () => {
    expect(hashCode("a")).toEqual("97");
    expect(hashCode("abc")).toEqual("96354");
    expect(hashCode("hello world")).toEqual("1794106052");
  });

  it("returns numeric zero for the empty string", () => {
    expect(hashCode("")).toEqual(0);
  });
});

describe("preparePrevSigs", () => {
  const renderSigs = (doc) =>
    render(
      <IntlProvider locale="en" messages={{}}>
        {preparePrevSigs(doc, "lg")}
      </IntlProvider>,
    );

  it("returns an empty string without previous signatures", () => {
    expect(preparePrevSigs({ type: "application/pdf" }, "lg")).toEqual("");
    expect(
      preparePrevSigs(
        { type: "application/pdf", prev_signatures: null },
        "lg",
      ),
    ).toEqual("");
    expect(
      preparePrevSigs(
        { type: "application/pdf", prev_signatures: "pdf read error" },
        "lg",
      ),
    ).toEqual("");
    expect(
      preparePrevSigs({ type: "application/pdf", prev_signatures: "" }, "lg"),
    ).toEqual("");
  });

  it("shows the common name of a PDF signature", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures: "Common Name: John Doe, Serial Number: 123",
    });
    expect(screen.getByText("Previously signed by:")).toBeInTheDocument();
    const item = screen.getByTitle("Serial Number: 123");
    expect(item.textContent).toEqual("John Doe.");
  });

  it("splits signature segments on semicolons too", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures: "Common Name: John Doe; Serial Number: 123",
    });
    expect(screen.getByTitle("Serial Number: 123").textContent).toEqual(
      "John Doe.",
    );
  });

  it("falls back to given name and surname", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures: "Given Name: John; Surname: Doe; Serial Number: 9",
    });
    expect(screen.getByTitle("Serial Number: 9").textContent).toEqual(
      "John Doe.",
    );
  });

  it("falls back to the serial number", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures: "Serial Number: 42",
    });
    expect(screen.getByText("42.")).toBeInTheDocument();
  });

  it("separates multiple signatures with commas", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures:
        "Common Name: John Doe; Serial Number: 1|Common Name: Jane Roe; Serial Number: 2",
    });
    expect(screen.getByText("John Doe,")).toBeInTheDocument();
    expect(screen.getByText("Jane Roe.")).toBeInTheDocument();
  });

  it("shows XML signatures by OID given name and surname", () => {
    renderSigs({
      type: "text/xml",
      prev_signatures: "2.5.4.42=John; 2.5.4.4=Doe; 2.5.4.3=CN",
    });
    const item = screen.getByText("John Doe.");
    expect(item.title).toEqual("2.5.4.42=John; 2.5.4.4=Doe; 2.5.4.3=CN");
  });

  it("skips XML signatures without the name OIDs", () => {
    const { container } = renderSigs({
      type: "text/xml",
      prev_signatures: "2.5.4.3=CN",
    });
    expect(screen.getByText("Previously signed by:")).toBeInTheDocument();
    expect(container.querySelectorAll(".info-row-item").length).toEqual(0);
  });

  it("shows Unknown for signatures it cannot parse", () => {
    renderSigs({
      type: "application/pdf",
      prev_signatures: "garbage",
    });
    expect(screen.getByText("Previously signed by:")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

describe("nameForCopy", () => {
  const empty = { templates: [], documents: [], owned: [] };

  it("appends a suffix before the extension", () => {
    expect(nameForCopy({ ...empty, docName: "doc.pdf" })).toEqual("doc-1.pdf");
  });

  it("appends a suffix without an extension", () => {
    expect(nameForCopy({ ...empty, docName: "doc" })).toEqual("doc-1");
  });

  it("keeps earlier dots in the name", () => {
    expect(nameForCopy({ ...empty, docName: "a.b.pdf" })).toEqual("a.b-1.pdf");
  });

  it("skips names already taken in any collection", () => {
    const props = {
      docName: "doc.pdf",
      templates: [{ name: "doc-1.pdf" }],
      documents: [{ name: "doc-2.pdf" }],
      owned: [{ name: "doc-3.pdf" }],
    };
    expect(nameForCopy(props)).toEqual("doc-4.pdf");
  });
});

describe("nameForDownload", () => {
  it("appends the suffix before the extension", () => {
    expect(nameForDownload("doc.pdf", "signed")).toEqual("doc-signed.pdf");
  });

  it("appends the suffix without an extension", () => {
    expect(nameForDownload("doc", "signed")).toEqual("doc-signed");
  });

  it("numbers the name until it is free in the state", () => {
    const state = {
      template: { documents: [] },
      documents: { documents: [{ name: "doc-signed.pdf" }] },
      main: {
        owned_multisign: [{ name: "doc-signed-1.pdf" }],
        pending_multisign: undefined,
      },
    };
    expect(nameForDownload("doc.pdf", "signed", state)).toEqual(
      "doc-signed-2.pdf",
    );
  });

  it("numbers extensionless names too", () => {
    const state = {
      template: { documents: [] },
      documents: { documents: [{ name: "doc-signed" }] },
      main: { owned_multisign: [], pending_multisign: [] },
    };
    expect(nameForDownload("doc", "signed", state)).toEqual("doc-signed-1");
  });
});

describe("getCreationDate", () => {
  it("reads a numeric timestamp", () => {
    expect(getCreationDate({ created: 1600000000000 }).getTime()).toEqual(
      1600000000000,
    );
    expect(getCreationDate({ created: "1600000000000" }).getTime()).toEqual(
      1600000000000,
    );
  });

  it("parses a date string", () => {
    expect(
      getCreationDate({ created: "2020-10-20T15:13:55Z" }).getTime(),
    ).toEqual(Date.parse("2020-10-20T15:13:55Z"));
  });

  it("returns null for unparsable input", () => {
    expect(getCreationDate({ created: "nonsense" })).toEqual(null);
  });
});

describe("getOrdinal", () => {
  it("formats English ordinals", () => {
    expect(getOrdinal("en", 1)).toEqual("1st");
    expect(getOrdinal("en", 2)).toEqual("2nd");
    expect(getOrdinal("en", 3)).toEqual("3rd");
    expect(getOrdinal("en", 4)).toEqual("4th");
    expect(getOrdinal("en", 11)).toEqual("11th");
    expect(getOrdinal("en", 21)).toEqual("21st");
  });

  it("formats Swedish ordinals", () => {
    expect(getOrdinal("sv", 1)).toEqual("1:a");
    expect(getOrdinal("sv", 2)).toEqual("2:a");
    expect(getOrdinal("sv", 3)).toEqual("3:e");
    expect(getOrdinal("sv", 11)).toEqual("11:e");
  });

  it("formats other languages with a feminine ordinal indicator", () => {
    expect(getOrdinal("es", 1)).toEqual("1ª");
    expect(getOrdinal("es", 2)).toEqual("2ª");
  });
});

describe("getInviteKey and getConfigPath", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("finds no key on a plain path", () => {
    expect(getInviteKey()).toEqual("");
    expect(getConfigPath()).toEqual("/sign/config");
  });

  it("extracts the key from a bankid path", () => {
    window.history.pushState({}, "", "/sign/bankid/abc123");
    expect(getInviteKey()).toEqual("abc123");
    expect(getConfigPath()).toEqual("/sign/config-eid/abc123");
  });

  it("extracts the key from a freja path", () => {
    window.history.pushState({}, "", "/sign/freja/xyz");
    expect(getInviteKey()).toEqual("xyz");
    expect(getConfigPath()).toEqual("/sign/config-eid/xyz");
  });

  it("extracts the key from a callback-eid path", () => {
    window.history.pushState({}, "", "/sign/callback-eid/k-1");
    expect(getInviteKey()).toEqual("k-1");
    expect(getConfigPath()).toEqual("/sign/config-eid/k-1");
  });

  it("treats an empty key as absent", () => {
    window.history.pushState({}, "", "/sign/bankid/");
    expect(getInviteKey()).toEqual("");
    expect(getConfigPath()).toEqual("/sign/config");
  });
});
