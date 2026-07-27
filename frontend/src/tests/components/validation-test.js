import {
  validateEmail,
  validateName,
  validateLang,
  validateSSN,
  validateBody,
  validateSendsigned,
  validateSkipfinal,
  validateOrdered,
  validateAllowBankID,
  validateNewname,
} from "components/validation";

// The validators return a <FormattedMessage/> element on error, or
// undefined when the value is valid.
const msg = (error) => error && error.props.defaultMessage;

describe("validateEmail", () => {
  const props = {
    mail: "tester@example.org",
    mail_aliases: ["tester@example.org", "alias@example.org"],
  };

  it("accepts a well formed address", () => {
    expect(validateEmail(props, [], 0)("invited@example.org")).toEqual(
      undefined,
    );
  });

  it("requires a value", () => {
    expect(msg(validateEmail(props, [], 0)(""))).toEqual("Required");
    expect(msg(validateEmail(props, [], 0)(undefined))).toEqual("Required");
  });

  it("rejects malformed addresses", () => {
    const validate = validateEmail(props, [], 0);
    ["not-an-email", "a@b", "a@b.c", "a@b.toolong", "a b@example.org"].forEach(
      (value) => {
        expect(msg(validate(value))).toEqual("Invalid email");
      },
    );
  });

  it("rejects the inviter's own address", () => {
    expect(msg(validateEmail(props, [], 0)("tester@example.org"))).toEqual(
      "Do not invite yourself",
    );
  });

  it("rejects the inviter's own address case insensitively", () => {
    expect(msg(validateEmail(props, [], 0)("TESTER@example.org"))).toEqual(
      "Do not invite yourself",
    );
  });

  it("rejects the inviter's aliases", () => {
    expect(msg(validateEmail(props, [], 0)("Alias@Example.org"))).toEqual(
      "Do not invite yourself",
    );
  });

  it("accepts any address when the props carry no aliases", () => {
    const validate = validateEmail({ mail: "me@example.org" }, [], 0);
    expect(validate("other@example.org")).toEqual(undefined);
  });

  it("rejects an address already used by an earlier invitee", () => {
    const allValues = [
      { email: "first@example.org" },
      { email: "second@example.org" },
    ];
    const validate = validateEmail(props, allValues, 1);
    expect(msg(validate("First@example.org"))).toEqual(
      "That email has already been invited",
    );
  });

  it("ignores addresses of later invitees", () => {
    const allValues = [
      { email: "first@example.org" },
      { email: "second@example.org" },
    ];
    const validate = validateEmail(props, allValues, 0);
    expect(validate("second@example.org")).toEqual(undefined);
  });

  it("skips validation when the form status disables it", () => {
    const validate = validateEmail(props, [], 0, { validate: false });
    expect(validate("")).toEqual(undefined);
    expect(validate("tester@example.org")).toEqual(undefined);
  });

  it("validates when the form status enables it", () => {
    const validate = validateEmail(props, [], 0, { validate: true });
    expect(msg(validate(""))).toEqual("Required");
  });
});

describe("validateName", () => {
  const validate = validateName({}, 0);

  it("accepts a plain name", () => {
    expect(validate("John Doe")).toEqual(undefined);
  });

  it("requires a value", () => {
    expect(msg(validate(""))).toEqual("Required");
  });

  it("rejects an unescaped double quote", () => {
    expect(msg(validate('John "Doe"'))).toEqual(
      "Display name includes ilegal characters.",
    );
  });

  it("rejects a backslash before an ordinary character", () => {
    expect(msg(validate("John\\Doe"))).toEqual(
      "Display name includes ilegal characters.",
    );
  });

  it("accepts escaped quotes and backslashes", () => {
    expect(validate('John \\"Doe\\"')).toEqual(undefined);
    expect(validate("John \\\\ Doe")).toEqual(undefined);
  });
});

describe("validateLang", () => {
  it("accepts the available languages", () => {
    expect(validateLang("en")).toEqual(undefined);
    expect(validateLang("sv")).toEqual(undefined);
  });

  it("rejects other languages", () => {
    expect(msg(validateLang("de"))).toEqual("Unknown language");
    expect(msg(validateLang(""))).toEqual("Unknown language");
  });
});

describe("validateSSN", () => {
  it("accepts an empty value", () => {
    expect(validateSSN("")).toEqual(undefined);
    expect(validateSSN(undefined)).toEqual(undefined);
  });

  it("accepts a valid 10 digit number", () => {
    expect(validateSSN("811218-9876")).toEqual(undefined);
  });

  it("accepts a + separator", () => {
    expect(validateSSN("811218+9876")).toEqual(undefined);
  });

  it("accepts a missing separator", () => {
    expect(validateSSN("8112189876")).toEqual(undefined);
  });

  it("accepts a valid 12 digit number", () => {
    expect(validateSSN("19811218-9876")).toEqual(undefined);
  });

  it("ignores whitespace", () => {
    expect(validateSSN("81 12 18 - 9876")).toEqual(undefined);
  });

  it("accepts a coordination number (day + 60)", () => {
    expect(validateSSN("811278-0005")).toEqual(undefined);
    expect(validateSSN("19811278-0005")).toEqual(undefined);
  });

  it("rejects a bad checksum", () => {
    expect(msg(validateSSN("811218-9875"))).toEqual("Invalid SSN");
  });

  it("rejects a malformed value", () => {
    expect(msg(validateSSN("not-a-ssn"))).toEqual("Invalid SSN");
    expect(msg(validateSSN("81121-9876"))).toEqual("Invalid SSN");
  });

  it("rejects an impossible month or day", () => {
    expect(msg(validateSSN("811318-9876"))).toEqual("Invalid SSN");
    expect(msg(validateSSN("811200-9876"))).toEqual("Invalid SSN");
    expect(msg(validateSSN("811232-9876"))).toEqual("Invalid SSN");
  });

  it("rejects a 12 digit number whose date does not exist", () => {
    expect(msg(validateSSN("19810230-1234"))).toEqual("Invalid SSN");
  });
});

describe("no-op validators", () => {
  it("always accept", () => {
    expect(validateBody("anything")).toEqual(undefined);
    expect(validateSendsigned(true)).toEqual(undefined);
    expect(validateSkipfinal(false)).toEqual(undefined);
    expect(validateOrdered(true)).toEqual(undefined);
    expect(validateAllowBankID(false)).toEqual(undefined);
  });
});

describe("validateNewname", () => {
  const props = {
    templates: [{ name: "template.pdf" }],
    documents: [{ name: "document.pdf" }],
    owned: [{ name: "owned.pdf" }],
  };
  const validate = validateNewname(props);

  it("accepts an unused name", () => {
    expect(validate("new.pdf")).toEqual(undefined);
  });

  it("requires a value", () => {
    expect(msg(validate(""))).toEqual("Required");
  });

  it("rejects names already used in any collection", () => {
    ["template.pdf", "document.pdf", "owned.pdf"].forEach((name) => {
      expect(msg(validate(name))).toEqual(
        "A document with that name has already been loaded",
      );
    });
  });
});
