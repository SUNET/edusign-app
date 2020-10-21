import React from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect } from "chai";

import {
  setupReduxComponent,
  mockFileData,
  dispatchEvtWithData,
  flushPromises,
  b64SamplePDFData,
  samplePDFData,
} from "tests/test-utils";
import Main from "components/Main";
import DnDAreaContainer from "containers/DnDArea";
import {
  addDocument,
  updateDocument,
  startSigning,
  setSigned,
} from "slices/Documents";

describe("Document representations", function () {
  afterEach(cleanup);

  it("It shows loading spinner after addDocument action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let filesize = screen.queryByTestId("little-spinner-0");
    expect(filesize).to.equal(null);

    let filetype = screen.queryByText(/loading .../i);
    expect(filetype).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    filesize = await waitFor(() => screen.getAllByText("1.5 KiB"));
    expect(filesize.length).to.equal(1);

    filetype = await waitFor(() => screen.getAllByText("application/pdf"));
    expect(filetype.length).to.equal(1);

    filesize = await waitFor(() => screen.getAllByTestId("little-spinner-0"));
    expect(filesize.length).to.equal(1);

    filetype = await waitFor(() => screen.getAllByText(/loading .../i));
    expect(filetype.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the file details after a updateDocument action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

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

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
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

  it("It hides the file details after clicking on the remove button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    let rmButton = screen.queryByText("Remove");
    expect(rmButton).to.equal(null);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
    await flushPromises(rerender, wrapped);

    rmButton = await waitFor(() => screen.getAllByText("Remove"));
    expect(rmButton.length).to.equal(1);

    fireEvent.click(rmButton[0]);
    await flushPromises(rerender, wrapped);

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

    rmButton = screen.queryByText("Remove");
    expect(rmButton).to.equal(null);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the preview after clicking on the preview button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    store.dispatch(addDocument(file2));
    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    const previewButton = await waitFor(() => screen.getAllByText("Preview"));
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.getAllByText(/Sample PDF for testing/));
    expect(pdf.length).to.equal(1);

    const prevButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-prev")
    );
    expect(prevButton.length).to.equal(1);

    const nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next")
    );
    expect(nextButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close")
    );
    expect(closeButton.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It hides the preview after clicking on the close button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    store.dispatch(addDocument(file2));
    await flushPromises(rerender, wrapped);

    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
    await flushPromises(rerender, wrapped);

    let pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    const previewButton = await waitFor(() => screen.getAllByText("Preview"));
    expect(previewButton.length).to.equal(1);

    fireEvent.click(previewButton[0]);
    await flushPromises(rerender, wrapped);

    let nextButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-next")
    );
    expect(nextButton.length).to.equal(1);

    const closeButton = await waitFor(() =>
      screen.getAllByTestId("preview-button-close")
    );
    expect(closeButton.length).to.equal(1);

    fireEvent.click(closeButton[0]);
    await flushPromises(rerender, wrapped);

    pdf = await waitFor(() => screen.queryByText(/Sample PDF for testing/));
    expect(pdf).to.equal(null);

    nextButton = await waitFor(() =>
      screen.queryByTestId("preview-button-next")
    );
    expect(nextButton).to.equal(null);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows signing... after dispatching the startSigning action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    store.dispatch(addDocument(file2));
    await flushPromises(rerender, wrapped);

    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
    await flushPromises(rerender, wrapped);

    let signing = await waitFor(() => screen.queryByText(/signing .../));
    expect(signing).to.equal(null);

    const signButton = await waitFor(() => screen.getAllByText("Sign"));
    expect(signButton.length).to.equal(1);

    const dlButton = await waitFor(() =>
      screen.getAllByTestId("download-link-0")
    );
    expect(dlButton.length).to.equal(1);

    store.dispatch(startSigning(0));
    await flushPromises(rerender, wrapped);

    signing = await waitFor(() => screen.getAllByText(/signing .../));
    expect(signing.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the download (signed) button after dispatching the setSigned action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    const fileObj = new File([samplePDFData], "test.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    const file2 = {
      name: "test2.pdf",
      size: fileObj.size,
      type: fileObj.type,
      blob: null,
    };
    store.dispatch(addDocument(file));
    store.dispatch(addDocument(file2));
    await flushPromises(rerender, wrapped);

    const updatedFile = {
      ...file,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(updateDocument(updatedFile));
    await flushPromises(rerender, wrapped);

    let signing = await waitFor(() => screen.queryByText(/signing .../));
    expect(signing).to.equal(null);

    let dlButton = await waitFor(() => screen.queryByText(/Download (signed)/));
    expect(signing).to.equal(null);

    const signButton = await waitFor(() => screen.getAllByText("Sign"));
    expect(signButton.length).to.equal(1);

    store.dispatch(startSigning(0));
    await flushPromises(rerender, wrapped);

    store.dispatch(setSigned(0));
    await flushPromises(rerender, wrapped);

    signing = await waitFor(() => screen.queryByText(/signing .../));
    expect(signing).to.equal(null);

    dlButton = await waitFor(() => screen.getAllByText("Download (signed)"));
    expect(dlButton.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
