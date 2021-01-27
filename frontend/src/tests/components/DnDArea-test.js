import React from "react";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { expect } from "chai";

import {
  setupComponent,
  setupReduxComponent,
  mockFileData,
  dispatchEvtWithData,
  flushPromises,
  samplePDFData,
} from "tests/test-utils";
import Main from "components/Main";
import DnDAreaContainer from "containers/DnDArea";
import * as edusignLogo from "../../../images/eduSign_logo.svg";

describe("DnDArea Component", function () {
  afterEach(cleanup);

  it("Shows dnd area ready to accept documents", function () {
    const { unmount } = setupComponent(<DnDAreaContainer />, {main: {loading: false, size: 'lg'}});

    const dndArea = screen.getAllByText(
      "Drag & drop here or click to browse"
    );
    expect(dndArea.length).to.equal(1);

    const dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);

    unmount();
  });

  it("Shows dnd area ready to drop documents", function () {
    const { unmount } = setupComponent(<DnDAreaContainer />, {
      dnd: { state: "receiving" },
    });

    const dndAreaDropping = screen.getAllByText("Drop documents here");
    expect(dndAreaDropping.length).to.equal(1);

    const dndArea = screen.queryByText(
      "Drag & drop here or click to browse"
    );
    expect(dndArea).to.equal(null);

    unmount();
  });

  it("It shows dnd area ready to drop documents on drag enter event ", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(
      <DnDAreaContainer />
    );

    let dndArea = screen.getAllByText(
      "Drag & drop here or click to browse"
    );
    expect(dndArea.length).to.equal(1);

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
      screen.getAllByText("Drop documents here")
    );
    expect(dndAreaDropping.length).to.equal(1);

    dndArea = await waitFor(() =>
      screen.queryByText("Drag & drop here or click to browse")
    );
    expect(dndArea).to.equal(null);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows dnd area back to waiting after a dragLeave event", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(
      <DnDAreaContainer />
    );

    let dndArea = screen.getAllByText(
      "Drag & drop here or click to browse"
    );
    expect(dndArea.length).to.equal(1);

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
      screen.getAllByText("Drop documents here")
    );
    expect(dndAreaDropping.length).to.equal(1);

    dndArea = await waitFor(() =>
      screen.queryByText("Drag & drop here or click to browse")
    );
    expect(dndArea).to.equal(null);

    dispatchEvtWithData(dnd, "dragleave", data);
    await flushPromises(rerender, wrapped);

    dndArea = screen.getAllByText(
      "Drag & drop here or click to browse"
    );
    expect(dndArea.length).to.equal(1);

    dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the file details after a drop event ", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let filesize = screen.queryByText("1.5 KiB");
    expect(filesize).to.equal(null);

    let filetype = screen.queryByText("application/pdf");
    expect(filetype).to.equal(null);

    let previewButton = screen.queryByText("Preview");
    expect(previewButton).to.equal(null);

    let downloadButton = screen.queryByText("Download");
    expect(downloadButton).to.equal(null);

    let signButton = screen.queryByText("Sign");
    expect(signButton).to.equal(null);

    let rmButton = screen.queryByText("Remove");
    expect(rmButton).to.equal(null);

    const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

    const file = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const data = mockFileData([file]);

    dispatchEvtWithData(dnd, "drop", data);
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    filesize = await waitFor(() => screen.getAllByText("1.5 KiB"));
    expect(filesize.length).to.equal(1);

    filetype = await waitFor(() => screen.getAllByText("application/pdf"));
    expect(filetype.length).to.equal(1);

    previewButton = await waitFor(() => screen.getAllByText("Preview"));
    expect(previewButton.length).to.equal(1);

    downloadButton = await waitFor(() => screen.getAllByText("Download"));
    expect(downloadButton.length).to.equal(1);

    signButton = await waitFor(() => screen.getAllByText("Sign"));
    expect(signButton.length).to.equal(1);

    rmButton = await waitFor(() => screen.getAllByText("Remove"));
    expect(rmButton.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It doesn't show the file details after a drop event with wrong file type", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

    let errorMsg = screen.queryByText(/Not a PDF/);
    expect(errorMsg).to.equal(null);

    const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

    const data = mockFileData([edusignLogo]);

    dispatchEvtWithData(dnd, "drop", data);
    await flushPromises(rerender, wrapped);

    errorMsg = await waitFor(() => screen.getAllByText(/Not a PDF/));
    expect(errorMsg.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
