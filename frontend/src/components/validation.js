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

export function validateSSN(value) {
  const error = (
    <FormattedMessage
      defaultMessage="Invalid PIN"
      key="invalid-pin"
    />
  );

  if (!value) return;

  const cleaned = value.replace(/\s/g, '');

  // Match 12-digit or 10-digit formats, with optional -/+ separator
  const match = cleaned.match(/^(\d{2})?(\d{2})(\d{2})(\d{2})([-+]?)(\d{4})$/);
  if (!match) return error;

  let [, century, year, month, day, sep, last4] = match;

  month = parseInt(month);
  day = parseInt(day);

  // Coordination numbers have 60 added to the day
  const realDay = day > 60 ? day - 60 : day;

  if (month < 1 || month > 12) return error;
  if (realDay < 1 || realDay > 31) return error;

  // Build a full date and validate it actually exists
  if (century) {
    const fullYear = parseInt(century + year);
    const date = new Date(fullYear, month - 1, realDay);
    if (
      date.getFullYear() !== fullYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== realDay
    ) {
      return error;
    }
  }
  // Luhn algorithm always on the 10-digit form: YYMMDDXXXX
  const digits = year + String(month).padStart(2, '0') + String(parseInt(match[4])).toString().padStart(2, '0') + last4;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let d = parseInt(digits[i]) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    sum += d;
  }

  if (sum % 10 === 0) return;

  return error;
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

export const validateSendInvites = (value) => {
  return undefined;
};
