import React from "react";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { expect } from "chai";
import fetchMock from "fetch-mock";

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
import DnDAreaContainer from "containers/DnDArea";
import * as edusignLogo from "../../../images/eduSign_logo.svg";
import { resetDb } from "init-app/database";
import { fetchConfig } from "slices/Main";

describe("DnDArea Component", function () {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    cleanup();
    fetchMock.restore();
  });

  it("Shows dnd area ready to accept documents", function () {
    const { unmount } = setupComponent(<DnDAreaContainer />, {
      main: { loading: false, size: "lg", environment: "testing" },
      dnd: { state: "waiting" },
    });

    try {
      const dndArea1 = screen.getAllByText(
        "Drag and drop files to be signed here",
      );
      expect(dndArea1.length).to.equal(1);

      const dndArea2 = screen.getAllByText("or");
      expect(dndArea2.length).to.equal(1);

      const dndArea3 = screen.getAllByText(
        "click here to choose files to be signed",
      );
      expect(dndArea3.length).to.equal(1);

      const dndAreaDropping = screen.queryByText("Drop documents here");
      expect(dndAreaDropping).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Shows dnd area ready to drop documents", function () {
    const { unmount } = setupComponent(<DnDAreaContainer />, {
      dnd: { state: "receiving" },
    });

    try {
      const dndAreaDropping = screen.getAllByText("Drop documents here");
      expect(dndAreaDropping.length).to.equal(1);

      const dndArea1 = screen.queryByText(
        "Drag and drop files to be signed here",
      );
      expect(dndArea1).to.equal(null);
      const dndArea2 = screen.queryByText("or");
      expect(dndArea2).to.equal(null);
      const dndArea3 = screen.queryByText(
        "click here to choose files to be signed",
      );
      expect(dndArea3).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("It shows dnd area ready to drop documents on drag enter event ", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(
      <DnDAreaContainer />,
    );

    try {
      let dndArea1 = screen.getAllByText(
        "Drag and drop files to be signed here",
      );
      expect(dndArea1.length).to.equal(1);
      let dndArea2 = screen.getAllByText("or");
      expect(dndArea2.length).to.equal(1);
      let dndArea3 = screen.getAllByText(
        "click here to choose files to be signed",
      );
      expect(dndArea3.length).to.equal(1);

      let dndAreaDropping = screen.queryByText("Drop documents here");
      expect(dndAreaDropping).to.equal(null);

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const file = new File([samplePDFData], "test.pdf", {
        type: "application/pdf",
      });
      const data = mockFileData([file]);

      dispatchEvtWithData(dnd, "dragenter", data);
      await flushPromises(rerender, wrapped);

      dndAreaDropping = await waitFor(() =>
        screen.getAllByText("Drop documents here"),
      );
      expect(dndAreaDropping.length).to.equal(1);

      dndArea1 = await waitFor(() =>
        screen.queryByText("Drag and drop files to be signed here"),
      );
      expect(dndArea1).to.equal(null);

      dndArea2 = await waitFor(() =>
        screen.queryByText("Drag and drop files to be signed here"),
      );
      expect(dndArea2).to.equal(null);

      dndArea3 = await waitFor(() =>
        screen.queryByText("Drag and drop files to be signed here"),
      );
      expect(dndArea3).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows dnd area back to waiting after a dragLeave event", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(
      <DnDAreaContainer />,
    );

    try {
      let dndArea1 = screen.getAllByText(
        "Drag and drop files to be signed here",
      );
      expect(dndArea1.length).to.equal(1);
      let dndArea2 = screen.getAllByText("or");
      expect(dndArea2.length).to.equal(1);
      let dndArea3 = screen.getAllByText(
        "click here to choose files to be signed",
      );
      expect(dndArea3.length).to.equal(1);

      let dndAreaDropping = screen.queryByText("Drop documents here");
      expect(dndAreaDropping).to.equal(null);

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

      dndAreaDropping = await waitFor(() =>
        screen.getAllByText("Drop documents here"),
      );
      expect(dndAreaDropping.length).to.equal(1);

      dndArea1 = await waitFor(() =>
        screen.queryByText("Drag and drop files to be signed here"),
      );
      expect(dndArea1).to.equal(null);

      dndArea2 = await waitFor(() => screen.queryByText("or"));
      expect(dndArea2).to.equal(null);

      dndArea3 = await waitFor(() =>
        screen.queryByText("click here to choose files to be signed"),
      );
      expect(dndArea3).to.equal(null);

      dispatchEvtWithData(dnd, "dragleave", data);
      await flushPromises(rerender, wrapped);

      dndArea1 = screen.getAllByText("Drag and drop files to be signed here");
      expect(dndArea1.length).to.equal(1);
      dndArea2 = screen.getAllByText("or");
      expect(dndArea2.length).to.equal(1);
      dndArea3 = screen.getAllByText("click here to choose files to be signed");
      expect(dndArea3.length).to.equal(1);

      dndAreaDropping = screen.queryByText("Drop documents here");
      expect(dndAreaDropping).to.equal(null);
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
      expect(filename).to.equal(null);

      let filesize = screen.queryByText("1.5 KiB");
      expect(filesize).to.equal(null);

      let previewButton = screen.queryByText("Preview and approve");
      expect(previewButton).to.equal(null);

      let rmButton = screen.queryByText("Remove");
      expect(rmButton).to.equal(null);

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
      expect(filename.length).to.equal(1);

      filesize = await waitFor(() => screen.getAllByText("1.5 KiB"));
      expect(filesize.length).to.equal(1);

      previewButton = await waitFor(() =>
        screen.getAllByText("Preview and approve"),
      );
      expect(previewButton.length).to.equal(1);

      rmButton = await waitFor(() => screen.getAllByText("Remove"));
      expect(rmButton.length).to.equal(1);

      fetchMock.restore();
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
      expect(errorMsg).to.equal(null);

      const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

      const data = mockFileData([edusignLogo]);

      dispatchEvtWithData(dnd, "drop", data);
      await flushPromises(rerender, wrapped);

      errorMsg = await waitFor(() => screen.getAllByText(/Not a PDF/));
      expect(errorMsg.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
