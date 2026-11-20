/**
 * @desc Help texts for the popovers shown on document representations,
 * keyed by document state.
 */

import { useIntl } from "react-intl";

export const useDocHelp = () => {
  const intl = useIntl();
  return (msg: string): string | undefined => {
    const msgs: Record<string, string> = {
      "loading-title": intl.formatMessage({
        defaultMessage: "Loading document",
        id: "docmanager-help-loading-title",
      }),
      loading: intl.formatMessage({
        defaultMessage: "Please wait while the document loads",
        id: "docmanager-help-loading",
      }),
      "loaded-title": intl.formatMessage({
        defaultMessage: "Document loaded",
        id: "docmanager-help-loaded-title",
      }),
      loaded: intl.formatMessage({
        defaultMessage:
          'To sign this document, select it on the checkbox to left and then click on the button labelled "Sign selected documents"',
        id: "docmanager-help-loaded",
      }),
      "failed-loading-title": intl.formatMessage({
        defaultMessage: "Failed loading document",
        id: "docmanager-help-failed-loading-title",
      }),
      "failed-loading": intl.formatMessage({
        defaultMessage: "This does not seem to be a valid document",
        id: "docmanager-help-failed-loading",
      }),
      "unconfirmed-title": intl.formatMessage({
        defaultMessage: "This document has not yet been approved",
        id: "docmanager-help-unconfirmed-title",
      }),
      unconfirmed: intl.formatMessage({
        defaultMessage:
          'Click on the button labeled "Preview and approve" to review the document and confirm that you approve it for signature',
        id: "docmanager-help-unconfirmed",
      }),
      "selected-title": intl.formatMessage({
        defaultMessage: "Document selected for signing",
        id: "docmanager-help-selected-title",
      }),

      selected: intl.formatMessage({
        defaultMessage:
          'Click on the button below labelled "Sign selected documents" to sign this document',
        id: "docmanager-help-selected",
      }),
      "failed-preparing-title": intl.formatMessage({
        defaultMessage: "Failed preparing document",
        id: "docmanager-help-failed-preparing-title",
      }),
      "failed-preparing": intl.formatMessage({
        defaultMessage:
          'There was a problem preparing the document for signing, clik on the button labelled "retry" to try again',
        id: "docmanager-help-failed-preparing",
      }),
      "signing-title": intl.formatMessage({
        defaultMessage: "Signing document",
        id: "docmanager-help-signing-title",
      }),
      signing: intl.formatMessage({
        defaultMessage: "Please wait while the document is signed",
        id: "docmanager-help-signing",
      }),
      "failed-signing-title": intl.formatMessage({
        defaultMessage: "Failed signing document",
        id: "docmanager-help-failed-signing-title",
      }),
      "failed-signing": intl.formatMessage({
        defaultMessage:
          'There was a problem signing the document, to try again click on the checkbox to the left and then on the button labelled "Sign selected documents"',
        id: "docmanager-help-failed-signing",
      }),
      "signed-title": intl.formatMessage({
        defaultMessage: "Document signed",
        id: "docmanager-help-signed-title",
      }),
      signed: intl.formatMessage({
        defaultMessage:
          'Document succesfully signed, click on the button labelled "Download (signed)" to download it',
        id: "docmanager-help-signed",
      }),
      "declined-title": intl.formatMessage({
        defaultMessage: "Signature declined",
        id: "docmanager-help-declined-title",
      }),
      declined: intl.formatMessage({
        defaultMessage:
          "You have declined to sign this document. It will dissapear from here if you reload the app.",
        id: "docmanager-help-declined-invited",
      }),
      "failed-loa-title": intl.formatMessage({
        defaultMessage: "Insufficient assurance level",
        id: "docmanager-help-failed-loa-title",
      }),
      "failed-loa": intl.formatMessage({
        defaultMessage:
          "Your account does not provide the required assurance level. Please take the steps to provide it.",
        id: "docmanager-help-failed-loa-invited",
      }),
      "incomplete-title": intl.formatMessage({
        defaultMessage: "Waiting for invited signatures",
        id: "docmanager-help-incomplete-title",
      }),
      incomplete: intl.formatMessage({
        defaultMessage:
          "You must wait for all invited people to respond before signing this document yourself.",
        id: "docmanager-help-incomplete",
      }),
    };
    return msgs[msg];
  };
};
