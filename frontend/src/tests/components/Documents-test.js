import React from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect } from "chai";
import fetchMock from "fetch-mock";

import {
  setupReduxComponent,
  flushPromises,
  b64SamplePDFData,
  samplePDFData,
  b64SamplePasswordPDFData,
  samplePasswordPDFData,
  b64Sample2pPDFData,
  sample2pPDFData,
} from "tests/test-utils";
import Main from "components/Main";
import { createDocument, loadDocuments } from "slices/Documents";
import { fetchConfig } from "slices/Main";

describe("Document representations", function () {
  afterEach(() => {
    cleanup();
    fetchMock.restore();
  });

  it("It shows the document after createDocument action", async () => {
    await showsTheDocumentAfterCreateDocumentAction({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the document after createDocument action - sm", async () => {
    await showsTheDocumentAfterCreateDocumentAction({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows a warning after createDocument action with a password protected document", async () => {
    await showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows a warning after createDocument action with a password protected document - sm", async () => {
    await showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the failed document after wrong createDocument action", async () => {
    await showsTheFailedDocumentAfterWrongCreateDocumentAction({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the failed document after wrong createDocument action", async () => {
    await showsTheFailedDocumentAfterWrongCreateDocumentAction({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows failed loading after createDocument with bad pdf", async () => {
    await showsFailedLoadingAfterCreateDocumentWithBadPdf({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows failed loading after createDocument with bad pdf - sm", async () => {
    await showsFailedLoadingAfterCreateDocumentWithBadPdf({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It hides the file details after clicking on the remove button", async () => {
    await hidesTheFileDetailsAfterClickingOnTheRemoveButton({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It hides the file details after clicking on the remove button - sm", async () => {
    await hidesTheFileDetailsAfterClickingOnTheRemoveButton({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the preview after clicking on the preview button", async () => {
    await showsThePreviewAfterClickingOnThePreviewButton({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It shows the preview after clicking on the preview button - sm", async () => {
    await showsThePreviewAfterClickingOnThePreviewButton({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It changes pages of the preview with the next and prev buttons", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It changes pages of the preview with the next and prev buttons - sm", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It changes pages of the preview with the last and first buttons", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons(
      {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [],
          pending_multisign: [],
        },
      },
      "first",
      "last"
    );
  });

  it("It changes pages of the preview with the last and first buttons - sm", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons(
      {
        payload: {
          size: "sm",
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [],
          pending_multisign: [],
        },
      },
      "first",
      "last"
    );
  });

  it("It hides the preview after clicking on the close button", async () => {
    await hidesThePreviewAfterClickingOnTheCloseButton({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It hides the preview after clicking on the close button - sm", async () => {
    await hidesThePreviewAfterClickingOnTheCloseButton({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
  });

  it("It shows the spinner after clicking on the sign button", async () => {
    await showsTheSpinnerAfterClickingOnTheSignButton({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the spinner after clicking on the sign button - sm", async () => {
    await showsTheSpinnerAfterClickingOnTheSignButton({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error message after create sign request returns error message", async () => {
    await showsErrorMessageAfterCreateSignRequestReturnsErrorMessage({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error message after create sign request returns error message - sm", async () => {
    await showsErrorMessageAfterCreateSignRequestReturnsErrorMessage({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the spinner after create sign request returns expired cache", async () => {
    await showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows the spinner after create sign request returns expired cache - sm", async () => {
    await showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error message after recreate sign request returns error", async () => {
    await showsErrorMessageAfterRecreateSignRequestReturnsError({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error message after recreate sign request returns error - sm", async () => {
    await showsErrorMessageAfterRecreateSignRequestReturnsError({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It carries the sign response after getting the signed docs", async () => {
    await carriesTheSignResponseAfterGettingTheSignedDocs({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It carries the sign response after getting the signed docs - sm", async () => {
    await carriesTheSignResponseAfterGettingTheSignedDocs({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error after a failure at the get-signed endpoint", async () => {
    await showsErrorAfterAfailureAtTheGetSignedEndpoint({
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });

  it("It shows error after a failure at the get-signed endpoint - sm", async () => {
    await showsErrorAfterAfailureAtTheGetSignedEndpoint({
      payload: {
        size: "sm",
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
      },
    });
  });
});

const showsTheDocumentAfterCreateDocumentAction = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByTestId("button-preview-0");
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByTestId("rm-button-test.pdf");
    expect(buttonRemove).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    buttonPreview = await waitFor(() => screen.getAllByTestId("button-preview-0"));
    expect(buttonPreview.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByTestId("rm-button-0"));
    expect(buttonRemove.length).to.equal(1);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument = async (
  payload
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    let warning = screen.queryByText(
      /Please do not supply a password protected document/
    );
    expect(warning).to.equal(null);

    const fileObj = new File([samplePasswordPDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePasswordPDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    warning = await waitFor(() =>
      screen.getAllByText(/Please do not supply a password protected document/i)
    );
    expect(warning.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheFailedDocumentAfterWrongCreateDocumentAction = async (
  payload
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText("test.pdf");
    expect(filename).to.equal(null);

    let buttonRetry = screen.queryByTestId("button-retry-0");
    expect(buttonRetry).to.equal(null);

    let buttonRemove = screen.queryByTestId("rm-button-0");
    expect(buttonRemove).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "dummy error in add-doc",
      error: true,
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText("test.pdf"));
    expect(filename.length).to.equal(1);

    buttonRetry = await waitFor(() => screen.getAllByTestId("button-retry-0"));
    expect(buttonRetry.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByTestId("rm-button-0"));
    expect(buttonRemove.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsFailedLoadingAfterCreateDocumentWithBadPdf = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByTestId("button-preview-0");
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByTestId("rm-button-test.pdf");
    expect(buttonRemove).to.equal(null);

    const file = {
      name: "test.pdf",
      size: 1500,
      type: "application/pdf",
      blob: "Bad PDF document",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByTestId("rm-button-0"));
    expect(buttonRemove.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByText(/Malformed PDF/i));
    expect(buttonRemove.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const hidesTheFileDetailsAfterClickingOnTheRemoveButton = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    let rmButton = screen.queryByTestId("rm-button-test.pdf");
    expect(rmButton).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    rmButton = await waitFor(() => screen.getAllByTestId("rm-button-0"));
    expect(rmButton.length).to.equal(1);

    fireEvent.click(rmButton[0]);
    await flushPromises(rerender, wrapped);

    const filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    const filesize = screen.queryByText("1.5 KiB");
    expect(filesize).to.equal(null);

    const previewButton = screen.queryByTestId("button-preview-0");
    expect(previewButton).to.equal(null);

    const downloadButton = screen.queryByTestId("button-dlsigned-0");
    expect(downloadButton).to.equal(null);

    rmButton = screen.queryByText("rm-button-test.pdf");
    expect(rmButton).to.equal(null);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsThePreviewAfterClickingOnThePreviewButton = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);
    store.dispatch(createDocument({doc: file2, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    const previewButton = await waitFor(() => screen.getAllByTestId("button-preview-0"));
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    const fstButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-first-0")
    );
    expect(fstButton.length).to.equal(1);

    const prevButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-prev-0")
    );
    expect(prevButton.length).to.equal(1);

    const nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next-0")
    );
    expect(nextButton.length).to.equal(1);

    const lastButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-last-0")
    );
    expect(lastButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close-0")
    );
    expect(closeButton.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const changesPagesOfThePreviewWithTheNextAndPrevButtons = async (
  payload,
  fst = "prev",
  lst = "next"
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([sample2pPDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64Sample2pPDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Test page 1/));
    expect(pdf).to.equal(null);

    let pdf2 = await waitFor(() => screen.queryByText(/Test page 2/));
    expect(pdf2).to.equal(null);

    const previewButton = await waitFor(() => screen.getAllByTestId("button-preview-0"));
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.getAllByText(/Test page 1/));
    expect(pdf.length).to.equal(1);

    pdf2 = await waitFor(() => screen.queryByText(/Test page 2/));
    expect(pdf2).to.equal(null);

    const nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-" + lst + "-0")
    );
    expect(nextButton.length).to.equal(1);

    fireEvent.click(nextButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.queryByText(/Test page 1/));
    expect(pdf).to.equal(null);

    pdf2 = await waitFor(() => screen.getAllByText(/Test page 2/));
    expect(pdf2.length).to.equal(1);

    const prevButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-" + fst + "-0")
    );
    expect(prevButton.length).to.equal(1);

    fireEvent.click(prevButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.getAllByText(/Test page 1/));
    expect(pdf.length).to.equal(1);

    pdf2 = await waitFor(() => screen.queryByText(/Test page 2/));
    expect(pdf2).to.equal(null);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const hidesThePreviewAfterClickingOnTheCloseButton = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);
    store.dispatch(createDocument({doc: file2, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    const previewButton = await waitFor(() => screen.getAllByTestId("button-preview-0"));
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    let nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next-0")
    );
    expect(nextButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close-0")
    );
    expect(closeButton.length).to.equal(1);

    fireEvent.click(closeButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    nextButton = await waitFor(() =>
      screen.queryByTestId("preview-button-next-test.pdf")
    );
    expect(nextButton).to.equal(null);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheSpinnerAfterClickingOnTheSignButton = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .once(
        { url: "/sign/add-doc", method: "POST" },
        {
          message: "document added",
          payload: {
            ref: "dummy ref",
            sign_requirement: "dummy sign requirement",
          },
        }
      )
      .once(
        { url: "/sign/create-sign-request", method: "POST" },
        {
          payload: {
            relay_state: "dummy relay state",
            sign_request: "dummy sign request",
            binding: "dummy binding",
            destination_url: "https://dummy.destination.url",
            documents: [{ name: "test.pdf", id: "dummy id" }],
          },
        }
      );

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() =>
      screen.getAllByTestId("little-spinner-0")
    );
    expect(spinner.length).to.equal(1);

    const text = await waitFor(() => screen.getAllByText("signing ..."));
    expect(text.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsErrorMessageAfterCreateSignRequestReturnsErrorMessage = async (
  payload
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .once(
        { url: "/sign/add-doc", method: "POST" },
        {
          message: "document added",
          payload: {
            ref: "dummy ref",
            sign_requirement: "dummy sign requirement",
          },
        }
      )
      .once(
        { url: "/sign/create-sign-request", method: "POST" },
        {
          message: "dummy error in create-sign-request",
          error: true,
        }
      );

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() =>
      screen.getAllByText("Problem creating signature request")
    );
    expect(text.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache = async (
  payload
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-sign-request", {
        message: "expired cache",
        error: true,
      })
      .post("/sign/recreate-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [{ name: "test.pdf", id: "dummy id" }],
        },
      });

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() =>
      screen.getAllByTestId("little-spinner-0")
    );
    expect(spinner.length).to.equal(1);

    const text = await waitFor(() => screen.getAllByText("signing ..."));
    expect(text.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsErrorMessageAfterRecreateSignRequestReturnsError = async (
  payload
) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-sign-request", {
        message: "expired cache",
        error: true,
      })
      .post("/sign/recreate-sign-request", {
        message: "error in recreate sign request",
        error: true,
      });

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() =>
      screen.getAllByText("Problem creating signature request")
    );
    expect(text.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const carriesTheSignResponseAfterGettingTheSignedDocs = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          key: "dummy key",
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [
            {
              name: "test.pdf",
              key: "dummy key",
              ref: "dummy ref",
              sign_requirement: "dummy sign requirement",
            },
          ],
        },
      })
      .post("/sign/get-signed", {
        message: "documents signed",
        payload: {
          documents: [
            { id: "dummy key", signed_content: "dummy signed content" },
          ],
        },
      });

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const signHolder = window.document.createElement("div");
    signHolder.setAttribute("id", "sign-response-holder");
    signHolder.setAttribute("data-signresponse", "dummy sign response");
    signHolder.setAttribute("data-relaystate", "dummy relay state");
    const body = window.document.getElementsByTagName("body")[0];
    body.appendChild(signHolder);

    store.dispatch(loadDocuments({intl: {formatMessage: (defaultMessage, id) => defaultMessage}}));

    const filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    const buttonSigned = await waitFor(() =>
      screen.getAllByTestId("button-dlsigned-0")
    );
    expect(buttonSigned.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsErrorAfterAfailureAtTheGetSignedEndpoint = async (payload) => {
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    fetchMock.get("/sign/config", payload);
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() =>
      screen.getAllByTestId("clear-in-header")
    );
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    const confirmButton = await waitFor(() =>
      screen.getAllByTestId("confirm-clear-session-confirm-button")
    );
    expect(confirmButton.length).to.equal(1);

    fireEvent.click(confirmButton[0]);
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-sign-request", {
        payload: {
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [{ name: "test.pdf", id: "dummy-id" }],
        },
      })
      .post("/sign/get-signed", {
        message: "problem signing documents",
        error: true,
      });

    store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign Selected Documents")
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const signHolder = window.document.createElement("div");
    signHolder.setAttribute("id", "sign-response-holder");
    signHolder.setAttribute("data-signresponse", "dummy sign response");
    signHolder.setAttribute("data-relaystate", "dummy relay state");
    const body = window.document.getElementsByTagName("body")[0];
    body.appendChild(signHolder);

    store.dispatch(loadDocuments({intl: {formatMessage: (defaultMessage, id) => defaultMessage}}));

    const filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    const buttonPreview = await waitFor(() =>
      screen.getAllByTestId("button-preview-0")
    );
    expect(buttonPreview.length).to.equal(1);

    const buttonRemove = await waitFor(() =>
      screen.getAllByTestId("rm-button-0")
    );
    expect(buttonRemove.length).to.equal(1);

    const errorMsg = await waitFor(() =>
      screen.getAllByText(/Problem signing the document/i)
    );
    expect(errorMsg.length).to.equal(1);

  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};
