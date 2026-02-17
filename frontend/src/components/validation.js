import React from "react";
import { FormattedMessage } from "react-intl";

export const validateEmail = (props, allValues, idx, status) => {
  const mail = props.mail;
  const mail_aliases = props.mail_aliases;
  return (value) => {
    let error;
    if (status !== undefined && !status.validate) return error;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      error = (
        <FormattedMessage defaultMessage="Invalid email" key="invalid-email" />
      );
    } else if (
      value.toLowerCase() === mail ||
      (mail_aliases !== undefined && mail_aliases.includes(value.toLowerCase()))
    ) {
      error = (
        <FormattedMessage
          defaultMessage="Do not invite yourself"
          key="do-no-invite-yourself"
        />
      );
    } else {
      let count = 0;
      allValues.forEach((val, i) => {
        if (idx > i && val.email.toLowerCase() === value.toLowerCase()) {
          count += 1;
        }
      });
      if (count > 0) {
        error = (
          <FormattedMessage
            defaultMessage="That email has already been invited"
            key="email-problem-dup"
          />
        );
      }
    }
    return error;
  };
};

export const validateName = (props, index) => {
  const _validateName = (value) => {
    let error;
    const displayNameRegex = /^(?:[^"\\]|\\["\\])*$/;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else if (!displayNameRegex.test(value)) {
      error = (
        <FormattedMessage
          defaultMessage="Display name includes ilegal characters."
          key="dn-ilegal-chars"
        />
      );
    }
    return error;
  };
  return _validateName;
};

export const validateLang = (value) => {
  let found = false;

  AVAILABLE_LANGUAGES.forEach((lang) => {
    if (lang[0] === value) {
      found = true;
    }
  });
  if (!found) {
    return (
      <FormattedMessage
        defaultMessage="Unknown language"
        key="unknown-language"
      />
    );
  }
  return undefined;
};

function validateSSN(value) {
  // Remove any non-digits except hyphen/plus
  const cleaned = value.replace(/\s/g, '');

  // Match formats: YYYYMMDD-XXXX, YYYYMMDDXXXX, YYMMDD-XXXX, YYMMDDXXXX
  // The '+' sign indicates the person is 100+ years old
  const match = cleaned.match(/^(\d{2})?(\d{6})[-+]?(\d{4})$/);
  if (!match) return false;

  const [, century, datepart, last4] = match;
  const digits = datepart + last4; // 10 digits for Luhn

  // Validate date (basic check)
  const year = century ? parseInt(century + datepart.slice(0, 2)) : null;
  const month = parseInt(datepart.slice(2, 4));
  const day = parseInt(datepart.slice(4, 6));

  // Month must be 01-12 (or 20+ for coordination numbers where 60 is added to day)
  if (month < 1 || month > 12) return false;

  // Day: 01-31 for normal, 61-91 for coordination numbers (day + 60)
  if (!((day >= 1 && day <= 31) || (day >= 61 && day <= 91))) return false;

  // Luhn algorithm on the last 10 digits (YYMMDDXXXX)
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let d = parseInt(digits[i]) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    sum += d;
  }

  return sum % 10 === 0;
}

export const validateBody = (value) => {
  return undefined;
};

export const validateSendsigned = (value) => {
  return undefined;
};

export const validateSkipfinal = (value) => {
  return undefined;
};

export const validateOrdered = (value) => {
  return undefined;
};

export const validateAllowBankID = (value) => {
  return undefined;
};

export const validateNewname = (props) => {
  return (value) => {
    let error;

    if (!value) {
      error = (
        <FormattedMessage defaultMessage="Required" key="required-field" />
      );
    } else {
      const dupError = (
        <FormattedMessage
          defaultMessage="A document with that name has already been loaded"
          key="save-doc-problem-dup"
        />
      );
      props.templates.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });

      props.documents.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });

      props.owned.forEach((document) => {
        if (document.name === value) {
          error = dupError;
        }
      });
    }
    return error;
  };
};
