import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { Formik } from "formik";

import { setupComponent } from "tests/test-utils";
import {
  docName,
  docSize,
  docCreated,
  infoLine,
  infoLine2,
  namedSpinner,
  selectDoc,
  dummySelectDoc,
  forcedPreviewButton,
  multiSignButton,
  signButton,
  removeConfirmButton,
  removeTemplate,
  removeButton,
  downloadSignedButton,
  downloadDraftButton,
  retryButton,
  showMessage,
  skipSignatureButton,
  declineSignatureButton,
  dummyButton,
  delegateButton,
  buttonSignSelected,
  buttonDownloadAll,
  buttonClearPersonal,
  skipFinalControl,
  sendsignedControl,
} from "components/widgets";

const intl = { formatMessage: ({ defaultMessage }) => defaultMessage };

const renderWidget = (jsx) => setupComponent(<>{jsx}</>, {});

describe("widgets", function () {
  it("docName shows the document name", function () {
    const { unmount } = renderWidget(docName({ name: "test.pdf" }));
    try {
      expect(screen.getAllByText("test.pdf").length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("docSize shows the human readable size", function () {
    const { unmount } = renderWidget(docSize({ size: 1536 }));
    try {
      expect(screen.getAllByText("1.5 KiB").length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("docCreated shows the creation date", function () {
    const created = Date.parse("2026-07-27T10:00:00");
    const { unmount } = renderWidget(
      docCreated({ doc: { created: created }, size: "lg" }),
    );
    try {
      expect(screen.getAllByText("Created:").length).toEqual(1);
      expect(
        screen.getAllByText(new Date(created).toLocaleString()).length,
      ).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("docCreated shows nothing without a creation date", function () {
    const { unmount } = renderWidget(docCreated({ doc: {}, size: "lg" }));
    try {
      expect(screen.queryByText("Created:")).toEqual(null);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("infoLine shows date, required loa and ordered workflow", function () {
    const doc = {
      created: Date.now(),
      loa: "http://example.org/loa/low,Low",
      ordered: true,
    };
    const { unmount } = renderWidget(infoLine(doc, "lg"));
    try {
      expect(screen.getAllByText("Created:").length).toEqual(1);
      expect(screen.getAllByText("Required assurance level:").length).toEqual(
        1,
      );
      expect(screen.getAllByText("Low").length).toEqual(1);
      expect(screen.getAllByText("Workflow invitation").length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("infoLine shows none of the optional lines for a bare document", function () {
    const { unmount } = renderWidget(infoLine({}, "lg"));
    try {
      expect(screen.queryByText("Created:")).toEqual(null);
      expect(screen.queryByText("Required assurance level:")).toEqual(null);
      expect(screen.queryByText("Workflow invitation")).toEqual(null);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("infoLine2 shows the info messages", function () {
    const doc = {
      info_message: ["flattened-acroform", "removed-encryption-dictionary"],
    };
    const { unmount } = renderWidget(infoLine2(doc, { intl: intl, size: "lg" }));
    try {
      expect(screen.getAllByText("Info:").length).toEqual(1);
      expect(
        screen.getAllByText(/an active form that became locked/).length,
      ).toEqual(1);
      expect(
        screen.getAllByText(/an encryption dictionary. This was removed/)
          .length,
      ).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("infoLine2 shows nothing without an info message", function () {
    const { unmount } = renderWidget(
      infoLine2({}, { intl: intl, size: "lg" }),
    );
    try {
      expect(screen.queryByText("Info:")).toEqual(null);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("namedSpinner shows a spinner and the name", function () {
    const { unmount } = renderWidget(namedSpinner("idx", "signing"));
    try {
      expect(screen.getAllByText(/signing \.\.\./).length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("selectDoc shows a checkbox reflecting selection", function () {
    const handler = jest.fn();
    const props = { handleDocSelection: () => handler };
    const doc = { name: "test.pdf", key: "k1", state: "selected" };
    const { unmount } = renderWidget(selectDoc(props, doc));
    try {
      const checkbox = screen.getByTestId("doc-selector-k1");
      expect(checkbox.checked).toEqual(true);
      fireEvent.click(checkbox);
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("selectDoc shows an unchecked checkbox for unselected documents", function () {
    const props = { handleDocSelection: () => jest.fn() };
    const doc = { name: "test.pdf", key: "k1", state: "loaded" };
    const { unmount } = renderWidget(selectDoc(props, doc));
    try {
      expect(screen.getByTestId("doc-selector-k1").checked).toEqual(false);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("dummySelectDoc renders an empty selector slot", function () {
    const { container, unmount } = renderWidget(dummySelectDoc());
    try {
      expect(
        container.querySelectorAll(".doc-selector-flex-item").length,
      ).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("forcedPreviewButton triggers the forced preview handler", function () {
    const handler = jest.fn();
    const hof = jest.fn(() => handler);
    const props = { handleForcedPreview: hof };
    const doc = { name: "test.pdf", key: "k1" };
    const { unmount } = renderWidget(forcedPreviewButton(props, doc));
    try {
      const button = screen.getByText("Preview and approve");
      expect(hof).toHaveBeenCalledWith("k1");
      fireEvent.click(button);
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("multiSignButton triggers the invite form handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { openInviteForm: jest.fn(() => handler) };
    const { unmount } = renderWidget(multiSignButton(props, doc));
    try {
      const button = screen.getByText("Invite others to sign");
      expect(props.openInviteForm).toHaveBeenCalledWith(doc);
      fireEvent.click(button);
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("signButton triggers the sign handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { handleSendToSign: jest.fn(() => handler) };
    const { unmount } = renderWidget(signButton(props, doc));
    try {
      fireEvent.click(screen.getByText("Sign"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("removeConfirmButton uses the default confirmation id", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { showConfirm: jest.fn(() => handler) };
    const { unmount } = renderWidget(removeConfirmButton(props, doc));
    try {
      expect(props.showConfirm).toHaveBeenCalledWith("confirm-remove-test.pdf");
      fireEvent.click(screen.getByText("Remove"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("removeConfirmButton uses the given confirmation id", function () {
    const doc = { name: "test.pdf", key: "k1" };
    const props = { showConfirm: jest.fn(() => jest.fn()) };
    const { unmount } = renderWidget(
      removeConfirmButton(props, doc, "custom-id"),
    );
    try {
      expect(props.showConfirm).toHaveBeenCalledWith("custom-id");
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("removeTemplate triggers the confirmation", function () {
    const handler = jest.fn();
    const doc = { name: "template.pdf" };
    const props = { showConfirm: jest.fn(() => handler) };
    const { unmount } = renderWidget(removeTemplate(props, doc));
    try {
      expect(props.showConfirm).toHaveBeenCalledWith(
        "confirm-remove-template.pdf",
      );
      fireEvent.click(screen.getByText("Remove"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("removeButton triggers the remove handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf" };
    const props = { handleRemove: jest.fn(() => handler) };
    const { unmount } = renderWidget(removeButton(props, doc));
    try {
      expect(props.handleRemove).toHaveBeenCalledWith("test.pdf");
      fireEvent.click(screen.getByTestId("rm-button-test.pdf"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("downloadSignedButton triggers the download handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf" };
    const props = { handleDlSigned: jest.fn(() => handler), intl: intl };
    const { unmount } = renderWidget(downloadSignedButton(props, doc));
    try {
      expect(props.handleDlSigned).toHaveBeenCalledWith({
        docName: "test.pdf",
        intl: intl,
      });
      fireEvent.click(screen.getByText("Download (signed)"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("downloadDraftButton triggers the download handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { handleDlDraft: jest.fn(() => handler), intl: intl };
    const { unmount } = renderWidget(downloadDraftButton(props, doc));
    try {
      expect(props.handleDlDraft).toHaveBeenCalledWith({
        docKey: "k1",
        intl: intl,
      });
      fireEvent.click(screen.getByText("Download (draft)"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("retryButton triggers the retry handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf" };
    const props = { handleRetry: jest.fn(() => handler) };
    const { unmount } = renderWidget(retryButton(props, doc));
    try {
      expect(props.handleRetry).toHaveBeenCalledWith(doc, props);
      fireEvent.click(screen.getByText("Retry"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("showMessage renders the message as html", function () {
    const { unmount } = renderWidget(
      showMessage({ message: "<b>problem parsing</b>" }),
    );
    try {
      expect(screen.getAllByText("problem parsing").length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("skipSignatureButton triggers the skip handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf" };
    const props = { handleSkipSigning: jest.fn(() => handler) };
    const { unmount } = renderWidget(skipSignatureButton(props, doc));
    try {
      fireEvent.click(screen.getByText("Skip Signature"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("declineSignatureButton triggers the decline handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { handleDeclineSigning: jest.fn(() => handler), intl: intl };
    const { unmount } = renderWidget(declineSignatureButton(props, doc));
    try {
      expect(props.handleDeclineSigning).toHaveBeenCalledWith({
        doc: doc,
        intl: intl,
      });
      fireEvent.click(screen.getByText("Decline Signature"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("dummyButton renders an empty button slot", function () {
    const { container, unmount } = renderWidget(dummyButton({}));
    try {
      expect(
        container.querySelectorAll(".button-dummy-flex-item").length,
      ).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("delegateButton triggers the delegation handler", function () {
    const handler = jest.fn();
    const doc = { name: "test.pdf", key: "k1" };
    const props = { handleDelegateSigning: jest.fn(() => handler) };
    const { unmount } = renderWidget(delegateButton(props, doc));
    try {
      expect(props.handleDelegateSigning).toHaveBeenCalledWith("k1");
      fireEvent.click(screen.getByText("Delegate"));
      expect(handler).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("buttonSignSelected triggers its handler when enabled", function () {
    const onClick = jest.fn();
    const { unmount } = renderWidget(buttonSignSelected(false, onClick));
    try {
      const button = screen.getByText("Sign selected documents");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("buttonSignSelected is disabled when signing is disabled", function () {
    const onClick = jest.fn();
    const { unmount } = renderWidget(buttonSignSelected(true, onClick));
    try {
      const button = screen.getByTestId("button-sign");
      expect(button.disabled).toEqual(true);
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("buttonDownloadAll triggers its handler when enabled", function () {
    const onClick = jest.fn();
    const { unmount } = renderWidget(buttonDownloadAll(false, onClick));
    try {
      expect(screen.getAllByText("Download all signed").length).toEqual(1);
      fireEvent.click(screen.getByTestId("button-dlall"));
      expect(onClick).toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("buttonDownloadAll is disabled when downloads are disabled", function () {
    const onClick = jest.fn();
    const { unmount } = renderWidget(buttonDownloadAll(true, onClick));
    try {
      const button = screen.getByTestId("button-dlall");
      expect(button.disabled).toEqual(true);
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("buttonClearPersonal triggers its handler when enabled", function () {
    const onClick = jest.fn();
    const clearDb = jest.fn();
    const { unmount } = renderWidget(
      buttonClearPersonal(false, onClick, clearDb, intl),
    );
    try {
      const button = screen.getByText("Clear personal documents list");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
      // the confirmation dialog stays hidden until confirm state is set
      expect(screen.queryByText("Confirm Clear List")).toEqual(null);
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("skipFinalControl renders a checkbox with its label", function () {
    const { unmount } = setupComponent(
      <Formik initialValues={{ skipfinalChoice: false }} onSubmit={() => {}}>
        {() => <form>{skipFinalControl}</form>}
      </Formik>,
      {},
    );
    try {
      expect(
        screen.getAllByText("Finalise signature flow automatically").length,
      ).toEqual(1);
      expect(screen.getByTestId("skipfinal-choice-input").checked).toEqual(
        false,
      );
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });

  it("sendsignedControl renders a checkbox with its label", function () {
    const { unmount } = setupComponent(
      <Formik initialValues={{ sendsignedChoice: true }} onSubmit={() => {}}>
        {() => <form>{sendsignedControl}</form>}
      </Formik>,
      {},
    );
    try {
      expect(
        screen.getAllByText("Send signed document in email").length,
      ).toEqual(1);
      expect(screen.getByTestId("sendsigned-choice-input").checked).toEqual(
        true,
      );
    } catch (err) {
      unmount();
      throw err;
    }
    unmount();
  });
});
