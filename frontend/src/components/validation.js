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
    const displayNameRegex = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(\s+[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/;

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

export const validateSSN = (ssn) => {
    // Remove all non-digit characters
    const cleaned = ssn.replace(/\D/g, '');
    
    // Check if we have exactly 10 or 12 digits
    if (cleaned.length !== 10 && cleaned.length !== 12) {
        return false;
    }
    
    // If 12 digits, extract the last 10 digits (YYMMDD-XXXX format)
    const digits = cleaned.length === 12 ? cleaned.substring(2) : cleaned;
    
    // Extract components
    const year = parseInt(digits.substring(0, 2), 10);
    const month = parseInt(digits.substring(2, 4), 10);
    const day = parseInt(digits.substring(4, 6), 10);
    const num = digits.substring(6, 9);
    const checkDigit = parseInt(digits.substring(9, 10), 10);
    
    // Validate date components
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Basic date validation (doesn't handle all edge cases like leap years perfectly)
    // but sufficient for most validation purposes
    const date = new Date(2000 + year, month - 1, day);
    if (date.getFullYear() % 100 !== year || 
        date.getMonth() + 1 !== month || 
        date.getDate() !== day) {
        // Try with 1900s
        const date1900 = new Date(1900 + year, month - 1, day);
        if (date1900.getFullYear() % 100 !== year || 
            date1900.getMonth() + 1 !== month || 
            date1900.getDate() !== day) {
            return false;
        }
    }
    
    // Luhn algorithm validation
    const luhnDigits = digits.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
        let digit = luhnDigits[i];
        
        // Double every second digit (from the right, so positions 0,2,4,6,8)
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) {
                digit = digit - 9; // or digit = Math.floor(digit/10) + digit%10
            }
        }
        
        sum += digit;
    }
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    
    return calculatedCheckDigit === checkDigit;
};

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
