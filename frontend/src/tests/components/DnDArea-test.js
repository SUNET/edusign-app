import React from "react";
import { screen, waitFor, cleanup } from "@testing-library/react";
import fetchMock from "@fetch-mock/jest";

import {
  setupComponent,
  setupReduxComponent,
  mockFileData,
  dispatchEvtWithData,
  flushPromises,
  samplePDFData,
  b64SamplePDFData,
} from "tests/test-utils";
import Main from "components/Main";
import { docToFile } from "components/utils";
import DnDArea from "components/DnDArea";
import * as edusignLogo from "../../../images/eduSign_logo.svg";
import { resetDb } from "init-app/database";
import { fetchConfig } from "slices/Main";

const expectWaitingForDocuments = () => {
  expect(screen.getAllByText("Choose files or drag and drop").length).toEqual(
    1,
  );
  expect(screen.getAllByText("Browse Files").length).toEqual(1);
  expect(screen.getAllByText("Tap to choose files").length).toEqual(1);
  expect(screen.queryByText("Drop documents here")).toEqual(null);
};

const expectReadyToReceiveDocuments = () => {
  expect(screen.getAllByText("Drop documents here").length).toEqual(1);
  expect(screen.queryByText("Choose files or drag and drop")).toEqual(null);
  expect(screen.queryByText("Browse Files")).toEqual(null);
  expect(screen.queryByText("Tap to choose files")).toEqual(null);
};

describe("DnDArea Component", function () {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    cleanup();
    fetchMock.hardReset();
  });

  it("Shows dnd area ready to accept documents", function () {
    const { unmount } = setupComponent(<DnDArea />, {
      main: { loading: false, size: "lg", environment: "testing" },
      dnd: { state: "waiting" },
    });

    try {
      expectWaitingForDocuments();
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Shows dnd area ready to drop documents", function () {
    const { unmount } = setupComponent(<DnDArea />, {
      dnd: { state: "receiving" },
    });

    try {
      expectReadyToReceiveDocuments();
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("It shows dnd area ready to drop documents on drag enter event ", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<DnDArea />);

    try {
      expectWaitingForDocuments();

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const file = new File([samplePDFData], "test.pdf", {
        type: "application/pdf",
      });
      const data = mockFileData([file]);

      dispatchEvtWithData(dnd, "dragenter", data);
      await flushPromises(rerender, wrapped);

      await waitFor(() => expectReadyToReceiveDocuments());
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows dnd area back to waiting after a dragLeave event", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<DnDArea />);

    try {
      expectWaitingForDocuments();

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const doc = {
        name: "test.pdf",
        type: "application/pdf",
        blob: "data:application/pdf;base64," + b64SamplePDFData,
      };

      const file = docToFile(doc);
      const data = mockFileData([file]);

      dispatchEvtWithData(dnd, "dragenter", data);
      await flushPromises(rerender, wrapped);

      await waitFor(() => expectReadyToReceiveDocuments());

      dispatchEvtWithData(dnd, "dragleave", data);
      await flushPromises(rerender, wrapped);

      expectWaitingForDocuments();
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the file details after a drop event ", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      const payload = {
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
      };
      fetchMock.get("/sign/config", payload).get("/sign/poll", payload);
      await store.dispatch(fetchConfig());
      await flushPromises(rerender, wrapped);
      let filename = screen.queryByText(/test.pdf/i);
      expect(filename).toEqual(null);

      let filesize = screen.queryByText("1.5 KiB");
      expect(filesize).toEqual(null);

      let previewButton = screen.queryByText("Preview and approve");
      expect(previewButton).toEqual(null);

      let rmButton = screen.queryByText("Remove");
      expect(rmButton).toEqual(null);

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const file = new File([samplePDFData], "test.pdf", {
        type: "application/pdf",
      });
      const data = mockFileData([file]);

      fetchMock.post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      });

      dispatchEvtWithData(dnd, "drop", data);
      await flushPromises(rerender, wrapped);

      filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
      expect(filename.length).toEqual(1);

      filesize = await waitFor(() => screen.getAllByText("1.5 KiB"));
      expect(filesize.length).toEqual(1);

      // the drop handler is not awaited by the test, and the first PDF parse
      // in the process can take pdfjs longer than the default 1s
      previewButton = await waitFor(
        () => screen.getAllByText("Preview and approve"),
        { timeout: 5000 },
      );
      expect(previewButton.length).toEqual(1);

      rmButton = await waitFor(() => screen.getAllByText("Remove"));
      expect(rmButton.length).toEqual(1);

      fetchMock.hardReset();
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It doesn't show the file details after a drop event with wrong file type", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

    try {
      let errorMsg = screen.queryByText(/Not a PDF/);
      expect(errorMsg).toEqual(null);

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const data = mockFileData([edusignLogo]);

      dispatchEvtWithData(dnd, "drop", data);
      await flushPromises(rerender, wrapped);

      errorMsg = await waitFor(() => screen.getAllByText(/Not a PDF/));
      expect(errorMsg.length).toEqual(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
