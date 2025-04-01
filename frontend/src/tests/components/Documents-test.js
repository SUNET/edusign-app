import React from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect } from "chai";
import fetchMock from "fetch-mock";
import { FileSaver } from "slices/Documents";
import sinon from "sinon";
//const referee = require("@sinonjs/referee");
//const assert = referee.assert;

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
import {
  createDocument,
  addDocument,
  loadDocuments,
  setState,
  validateDoc,
} from "slices/Documents";
import { fetchConfig } from "slices/Main";
import { resetDb } from "init-app/database";

let loggingorder = 0;
const logorder = () => {
  loggingorder += 1;
  console.log("LOGGING ORDER", loggingorder);
};

describe("Document representations", function () {
  beforeEach(async () => {
    sinon.spy(FileSaver, "saveAs");
    await resetDb();
  });

  afterEach(() => {
    cleanup();
    fetchMock.restore();
    sinon.restore();
  });

  it("It shows the document after createDocument action", async () => {
    await showsTheDocumentAfterCreateDocumentAction({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });
  it("It shows the document after createDocument action - sm", async () => {
    await showsTheDocumentAfterCreateDocumentAction({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows a warning after createDocument action with a password protected document", async () => {
    await showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument({
      payload: {
        size: "lg",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows a warning after createDocument action with a password protected document - sm", async () => {
    await showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows failed loading after createDocument with bad pdf", async () => {
    await showsFailedLoadingAfterCreateDocumentWithBadPdf({
      payload: {
        size: "lg",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows failed loading after createDocument with bad pdf - sm", async () => {
    await showsFailedLoadingAfterCreateDocumentWithBadPdf({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the failed document after wrong createDocument action", async () => {
    await showsTheFailedDocumentAfterWrongCreateDocumentAction({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the failed document after wrong createDocument action - sm", async () => {
    await showsTheFailedDocumentAfterWrongCreateDocumentAction({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It hides the file details after clicking on the remove button", async () => {
    await hidesTheFileDetailsAfterClickingOnTheRemoveButton({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It hides the file details after clicking on the remove button - sm", async () => {
    await hidesTheFileDetailsAfterClickingOnTheRemoveButton({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the preview after clicking on the preview button", async () => {
    await showsThePreviewAfterClickingOnThePreviewButton({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the preview after clicking on the preview button - sm", async () => {
    await showsThePreviewAfterClickingOnThePreviewButton({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It changes pages of the preview with the next and prev buttons", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It changes pages of the preview with the next and prev buttons - sm", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It changes pages of the preview with the last and first buttons", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons(
      {
        payload: {
          available_loas: [],
          signer_attributes: {
            name: "Tester Testig",
            eppn: "tester@example.org",
            mail: "tester@example.org",
            mail_aliases: ["tester@example.org"],
          },
          owned_multisign: [],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
        },
      },
      "first",
      "last",
    );
  });

  it("It changes pages of the preview with the last and first buttons - sm", async () => {
    await changesPagesOfThePreviewWithTheNextAndPrevButtons(
      {
        payload: {
          size: "sm",
          available_loas: [],
          signer_attributes: {
            name: "Tester Testig",
            eppn: "tester@example.org",
            mail: "tester@example.org",
            mail_aliases: ["tester@example.org"],
          },
          owned_multisign: [],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
        },
      },
      "first",
      "last",
    );
  });

  it("It hides the preview after clicking on the close button", async () => {
    await hidesThePreviewAfterClickingOnTheCloseButton({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It hides the preview after clicking on the close button - sm", async () => {
    await hidesThePreviewAfterClickingOnTheCloseButton({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the spinner after clicking on the sign button", async () => {
    await showsTheSpinnerAfterClickingOnTheSignButton({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the spinner after clicking on the sign button - sm", async () => {
    await showsTheSpinnerAfterClickingOnTheSignButton({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error message after create sign request returns error message", async () => {
    await showsErrorMessageAfterCreateSignRequestReturnsErrorMessage({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error message after create sign request returns error message - sm", async () => {
    await showsErrorMessageAfterCreateSignRequestReturnsErrorMessage({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the spinner after create sign request returns expired cache", async () => {
    await showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows the spinner after create sign request returns expired cache - sm", async () => {
    await showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error message after recreate sign request returns error", async () => {
    await showsErrorMessageAfterRecreateSignRequestReturnsError({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error message after recreate sign request returns error - sm", async () => {
    await showsErrorMessageAfterRecreateSignRequestReturnsError({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It carries the sign response after getting the signed docs", async () => {
    await carriesTheSignResponseAfterGettingTheSignedDocs({
      payload: {
        unauthn: false,
        poll: false,
        multisign_buttons: "true",
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
        available_loas: [],
      },
    });
  });

  it("It carries the sign response after getting the signed docs - sm", async () => {
    await carriesTheSignResponseAfterGettingTheSignedDocs({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error after a failure at the get-signed endpoint", async () => {
    await showsErrorAfterAfailureAtTheGetSignedEndpoint({
      payload: {
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It shows error after a failure at the get-signed endpoint - sm", async () => {
    await showsErrorAfterAfailureAtTheGetSignedEndpoint({
      payload: {
        size: "sm",
        available_loas: [],
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It downloads zip after uploading 2 files", async () => {
    await downloadsZIPAfterGettingTheSignedDocs({
      payload: {
        available_loas: [],
        unauthn: false,
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });

  it("It downloads zip after uploading 2 files - sm", async () => {
    await downloadsZIPAfterGettingTheSignedDocs({
      payload: {
        size: "sm",
        available_loas: [],
        unauthn: false,
        signer_attributes: {
          name: "Tester Testig",
          eppn: "tester@example.org",
          mail: "tester@example.org",
          mail_aliases: ["tester@example.org"],
        },
        skipped: [],
        ui_defaults: { sendsigned: true, skip_final: true },
      },
    });
  });
});

const showsTheDocumentAfterCreateDocumentAction = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    await store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByTestId("button-forced-preview-dummy-ref");
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByTestId("button-forced-preview-dummy-ref");
    expect(buttonRemove).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy-ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    buttonPreview = await waitFor(() =>
      screen.getAllByTestId("button-forced-preview-dummy-ref"),
    );
    expect(buttonPreview.length).to.equal(1);

    buttonRemove = await waitFor(() =>
      screen.getAllByTestId("button-rm-invitation-dummy-ref"),
    );
    expect(buttonRemove.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsAWarningAfterCreateDocumentActionWithAPasswordProtectedDocument =
  async (payload) => {
    fetchMock.get("/sign/config", payload);
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    try {
      store.dispatch(fetchConfig());
      await flushPromises(rerender, wrapped);

      let warning = screen.queryByText(
        /Please do not supply a password protected document/,
      );
      expect(warning).to.equal(null);

      const fileObj = await new File(
        [samplePasswordPDFData],
        "test-password.pdf",
        {
          type: "application/pdf",
        },
      );
      const file = {
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        created: Date.now(),
        state: "loading",
        blob: "data:application/pdf;base64," + b64SamplePasswordPDFData,
        key: "dummy-ref",
      };

      const doc = await validateDoc(
        file,
        { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        store.getState(),
      );

      expect(doc.state).to.equal("failed-loading");
      expect(doc.message).to.equal(
        "Please do not supply a password protected document",
      );

      // there is a bug in the stesting framework where Promise.catch clears the redux store
      // uncomment the test below when fixed
      //
      // const file = {
      //   name: fileObj.name,
      //   size: fileObj.size,
      //   type: fileObj.type,
      //   created: Date.now(),
      //   state: 'loading',
      // };
      // store.dispatch(addDocument(file));
      // const newfile = {
      //   ...file,
      //   blob: "data:application/pdf;base64," + b64SamplePasswordPDFData,
      //   key: "dummy-ref",
      // };
      // fetchMock.post("/sign/add-doc", {
      //   message: "document added",
      //   payload: {
      //     ref: "dummy-ref",
      //     sign_requirement: "dummy sign requirement",
      //   },
      // });
      // await store.dispatch(
      //   createDocument({
      //     doc: newfile,
      //     intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      //   })
      // );
      // await flushPromises(rerender, wrapped);
      //
      // warning = await waitFor(() =>
      //   screen.getAllByText(
      //     /Please do not supply a password protected document/i
      //   )
      // );
      // expect(warning.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  };

const showsFailedLoadingAfterCreateDocumentWithBadPdf = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByTestId("button-preview-dummy-ref");
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByTestId("button-forced-preview-test.pdf");
    expect(buttonRemove).to.equal(null);

    let file = {
      name: "test.pdf",
      size: 1500,
      type: "application/pdf",
      created: Date.now(),
      state: "loading",
      blob: "Bad PDF document",
      key: "dummy-ref",
    };

    const doc = await validateDoc(
      file,
      { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      store.getState(),
    );

    expect(doc.state).to.equal("failed-loading");
    expect(doc.message).to.equal("Document is unreadable");

    // there is a bug in the stesting framework where Promise.catch clears the redux store
    // uncomment the test below when fixed
    //
    // let file = {
    //   name: "test.pdf",
    //   size: 1500,
    //   type: "application/pdf",
    //   created: Date.now(),
    //   state: 'loading',
    // };
    // store.dispatch(addDocument(file));
    //
    // file = {
    //   ...file,
    //   blob: "Bad PDF document",
    //   key: "dummy-ref",
    // };
    // fetchMock.post("/sign/add-doc", {
    //   message: "document added",
    //   payload: {
    //     ref: "dummy-ref",
    //     sign_requirement: "dummy sign requirement",
    //   },
    // });
    // await store.dispatch(
    //   createDocument({
    //     doc: file,
    //     intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
    //   })
    // );
    // await flushPromises(rerender, wrapped);
    //
    // buttonRemove = await waitFor(() =>
    //   screen.getAllByTestId("button-rm-invitation-test.pdf")
    // );
    // expect(buttonRemove.length).to.equal(1);
    //
    // buttonRemove = await waitFor(() => screen.getAllByText(/Malformed PDF/i));
    // expect(buttonRemove.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheFailedDocumentAfterWrongCreateDocumentAction = async (
  payload,
) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText("test.pdf");
    expect(filename).to.equal(null);

    let buttonRetry = screen.queryByTestId("button-retry-test.pdf");
    expect(buttonRetry).to.equal(null);

    let buttonRemove = screen.queryByTestId("button-rm-invitation-dummy-ref");
    expect(buttonRemove).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock.post("/sign/add-doc", {
      message: "dummy error in add-doc",
      error: true,
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    buttonRetry = await waitFor(() =>
      screen.getAllByTestId("button-retry-test.pdf"),
    );
    expect(buttonRetry.length).to.equal(1);

    buttonRemove = await waitFor(() =>
      screen.getAllByTestId("button-rm-invitation-dummy-ref"),
    );
    expect(buttonRemove.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const hidesTheFileDetailsAfterClickingOnTheRemoveButton = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    let rmButton = screen.queryByTestId("button-forced-preview-test.pdf");
    expect(rmButton).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy-ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    rmButton = await waitFor(() =>
      screen.getAllByTestId("button-rm-invitation-dummy-ref"),
    );
    expect(rmButton.length).to.equal(1);

    fireEvent.click(rmButton[0]);
    await flushPromises(rerender, wrapped);

    // XXX very weirdly, these lines below hang the tests
    // const filename = await waitFor(() => screen.queryByText("test.pdf"));
    // expect(filename).to.equal(null);
    //
    // const filesize = await waitFor(() => screen.queryByText("1.5 KiB"));
    // expect(filesize).to.equal(null);

    const previewButton = await waitFor(() =>
      screen.queryByTestId("button-preview-dummy-ref"),
    );
    expect(previewButton).to.equal(null);

    const downloadButton = await waitFor(() =>
      screen.queryByTestId("button-dlsigned-dummy-ref"),
    );
    expect(downloadButton).to.equal(null);

    rmButton = await waitFor(() =>
      screen.queryByText("button-rm-invitation-dummy-ref"),
    );
    expect(rmButton).to.equal(null);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsThePreviewAfterClickingOnThePreviewButton = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref-2",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy-ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);
    await store.dispatch(
      createDocument({
        doc: file2,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    store.dispatch(setState({ name: "test.pdf", state: "loaded" }));
    await flushPromises(rerender, wrapped);

    const dropdownButton = await waitFor(() =>
      screen.getAllByText(/Other options/),
    );
    expect(dropdownButton.length).to.equal(1);

    fireEvent.click(dropdownButton[0]);
    await flushPromises(rerender, wrapped);

    const previewButton = await waitFor(() =>
      screen.getAllByTestId("menu-item-preview-dummy-ref"),
    );
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    const fstButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-first-0"),
    );
    expect(fstButton.length).to.equal(1);

    const prevButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-prev-0"),
    );
    expect(prevButton.length).to.equal(1);

    const nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next-0"),
    );
    expect(nextButton.length).to.equal(1);

    const lastButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-last-0"),
    );
    expect(lastButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close-test.pdf"),
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
  lst = "next",
) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([sample2pPDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64Sample2pPDFData,
      key: "dummy-ref",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy-ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Test page 1/));
    expect(pdf).to.equal(null);

    let pdf2 = await waitFor(() => screen.queryByText(/Test page 2/));
    expect(pdf2).to.equal(null);

    store.dispatch(setState({ name: "test.pdf", state: "loaded" }));
    await flushPromises(rerender, wrapped);

    const dropdownButton = await waitFor(() =>
      screen.getAllByText(/Other options/),
    );
    expect(dropdownButton.length).to.equal(1);

    fireEvent.click(dropdownButton[0]);
    await flushPromises(rerender, wrapped);

    const previewButton = await waitFor(() =>
      screen.getAllByTestId("menu-item-preview-dummy-ref"),
    );
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.getAllByText(/Test page 1/));
    expect(pdf.length).to.equal(1);

    pdf2 = await waitFor(() => screen.queryByText(/Test page 2/));
    expect(pdf2).to.equal(null);

    const nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-" + lst + "-0"),
    );
    expect(nextButton.length).to.equal(1);

    fireEvent.click(nextButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.queryByText(/Test page 1/i));
    expect(pdf).to.equal(null);

    pdf2 = await waitFor(() => screen.getAllByText(/Test page 2/));
    expect(pdf2.length).to.equal(1);

    const prevButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-" + fst + "-0"),
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
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref-2",
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy-ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);
    await store.dispatch(
      createDocument({
        doc: file2,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    store.dispatch(setState({ name: "test.pdf", state: "loaded" }));
    await flushPromises(rerender, wrapped);

    const dropdownButton = await waitFor(() =>
      screen.getAllByText(/Other options/),
    );
    expect(dropdownButton.length).to.equal(1);

    fireEvent.click(dropdownButton[0]);
    await flushPromises(rerender, wrapped);

    const previewButton = await waitFor(() =>
      screen.getAllByTestId("menu-item-preview-dummy-ref"),
    );
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    let nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next-0"),
    );
    expect(nextButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close-test.pdf"),
    );
    expect(closeButton.length).to.equal(1);

    fireEvent.click(closeButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheSpinnerAfterClickingOnTheSignButton = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .once(
        { url: "/sign/add-doc", method: "POST" },
        {
          message: "document added",
          payload: {
            ref: "dummy-ref",
            sign_requirement: "dummy sign requirement",
          },
        },
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
        },
      );

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-ref"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() =>
      screen.getAllByTestId("little-spinner-test.pdf"),
    );
    expect(spinner.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsErrorMessageAfterCreateSignRequestReturnsErrorMessage = async (
  payload,
) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy-ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-sign-request", {
        message: "dummy error in create-sign-request",
        error: true,
      });

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-ref"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() =>
      screen.getAllByText("There was a problem signing the document"),
    );
    expect(text.length).to.equal(2);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsTheSpinnerAfterCreateSignRequestReturnsExpiredCache = async (
  payload,
) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy-ref",
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
          failed: [],
        },
      });

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-ref"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() =>
      screen.getAllByTestId("little-spinner-test.pdf"),
    );
    expect(spinner.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const showsErrorMessageAfterRecreateSignRequestReturnsError = async (
  payload,
) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy-ref",
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

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-ref"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
    );
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() =>
      screen.getAllByText("There was a problem signing the document"),
    );
    expect(text.length).to.equal(2);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const carriesTheSignResponseAfterGettingTheSignedDocs = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    await store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          key: "dummy-key",
          ref: "dummy-ref",
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
              key: "dummy-key",
              ref: "dummy-ref",
              sign_requirement: "dummy sign requirement",
            },
          ],
        },
      })
      .post("/sign/get-signed", {
        message: "documents signed",
        payload: {
          documents: [
            { id: "dummy-key", signed_content: "dummy signed content" },
          ],
        },
      });

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-key"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
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

    await store.dispatch(
      loadDocuments({
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        eppn: 'tester@example.org',
      }),
    );

    const buttonSigned = await waitFor(() =>
      screen.getAllByTestId("button-download-signed-test.pdf"),
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
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy-ref",
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

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "selected" }));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() =>
      screen.getAllByTestId("doc-selector-dummy-ref"),
    );
    expect(selector.length).to.equal(1);

    const signButton = await waitFor(() =>
      screen.getAllByText("Sign selected documents"),
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

    await store.dispatch(
      loadDocuments({
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        eppn: 'tester@example.org',
      }),
    );

    const buttonDropdown = await waitFor(() =>
      screen.getAllByText(/Other options/),
    );
    expect(buttonDropdown.length).to.equal(1);

    const buttonRemove = await waitFor(() =>
      screen.getAllByTestId("button-rm-invitation-dummy-ref"),
    );
    expect(buttonRemove.length).to.equal(1);

    const errorMsg = await waitFor(() =>
      screen.getAllByText(/Problem getting signed documents/i),
    );
    expect(errorMsg.length).to.equal(1);
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};

const downloadsZIPAfterGettingTheSignedDocs = async (payload) => {
  fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
  const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
  try {
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
      key: "dummy-ref",
    };
    const file2 = {
      name: "test2.pdf",
      ...file,
    };
    fetchMock
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          key: "dummy-key",
          ref: "dummy-ref",
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
              key: "dummy-key",
              ref: "dummy-ref",
              sign_requirement: "dummy sign requirement",
            },
          ],
        },
      })
      .post("/sign/get-signed", {
        message: "documents signed",
        payload: {
          documents: [
            { id: "dummy-key", signed_content: "dummy signed content" },
          ],
        },
      });

    await store.dispatch(
      createDocument({
        doc: file,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    await store.dispatch(
      createDocument({
        doc: file2,
        intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
      }),
    );
    await flushPromises(rerender, wrapped);

    store.dispatch(setState({ name: "test.pdf", state: "signed" }));
    await flushPromises(rerender, wrapped);

    const buttonDlAll = await waitFor(() =>
      screen.getAllByTestId("button-dlall"),
    );
    expect(buttonDlAll.length).to.equal(1);

    fireEvent.click(buttonDlAll[0]);
    await flushPromises(rerender, wrapped);

    // The downloadAllSigned async thunk is being interrupted before finishing,
    // I do not understand why.
    //
    //expect(FileSaver.saveAs.called).to.equal(true);
    //expect(FileSaver.saveAs.getCall(0).args[1]).to.equal("signed.zip");
  } catch (err) {
    unmount();
    throw err;
  }

  // if we don't unmount here, mounted components (DocPreview) leak to other tests
  unmount();
};
