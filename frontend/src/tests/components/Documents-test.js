import React from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect } from "chai";
import fetchMock from "fetch-mock";

import {
  setupReduxComponent,
  flushPromises,
  b64SamplePDFData,
  samplePDFData,
} from "tests/test-utils";
import Main from "components/Main";
import { createDocument, loadDocuments } from "slices/Documents";
import { fetchConfig } from "slices/Main";

describe("Document representations", function () {
  afterEach(cleanup);

  it("It shows the document after createDocument action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByText(/Preview/i);
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByText(/Remove/i);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    buttonPreview = await waitFor(() => screen.getAllByText(/Preview/i));
    expect(buttonPreview.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByText(/Remove/i));
    expect(buttonRemove.length).to.equal(1);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the failed document after wrong createDocument action", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText("test.pdf");
    expect(filename).to.equal(null);

    let buttonRetry = screen.queryByText(/Retry/i);
    expect(buttonRetry).to.equal(null);

    let buttonRemove = screen.queryByText(/Remove/i);
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
    fetchMock.post('/sign/add-doc', {
      message: "dummy error in add-doc",
      error: true
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText("test.pdf"));
    expect(filename.length).to.equal(1);

    buttonRetry = await waitFor(() => screen.getAllByText(/Retry/i));
    expect(buttonRetry.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByText(/Remove/i));
    expect(buttonRemove.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows failed loading after createDocument with bad pdf", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let buttonPreview = screen.queryByText(/Preview/i);
    expect(buttonPreview).to.equal(null);

    let buttonRemove = screen.queryByText(/Remove/i);
    expect(buttonRemove).to.equal(null);

    const file = {
      name: 'test.pdf',
      size: 1500,
      type: 'application/pdf',
      blob: "Bad PDF document",
    };
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByText(/Remove/i));
    expect(buttonRemove.length).to.equal(1);

    buttonRemove = await waitFor(() => screen.getAllByText(/Malformed PDF/i));
    expect(buttonRemove.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It hides the file details after clicking on the remove button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
    await flushPromises(rerender, wrapped);

    let rmButton = screen.queryByText("Remove");
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    rmButton = await waitFor(() => screen.getAllByText("Remove"));
    expect(rmButton.length).to.equal(1);

    fireEvent.click(rmButton[0]);
    await flushPromises(rerender, wrapped);

    let filename = screen.queryByText(/test.pdf/i);
    expect(filename).to.equal(null);

    let filesize = screen.queryByText("1.5 KiB");
    expect(filesize).to.equal(null);

    let previewButton = screen.queryByText("Preview");
    expect(previewButton).to.equal(null);

    let downloadButton = screen.queryByText("Download");
    expect(downloadButton).to.equal(null);

    let signButton = screen.queryByText("Sign");
    expect(signButton).to.equal(null);

    rmButton = screen.queryByText("Remove");
    expect(rmButton).to.equal(null);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the preview after clicking on the preview button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);
    store.dispatch(createDocument(file2));
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

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It hides the preview after clicking on the close button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);
    store.dispatch(createDocument(file2));
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

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the spinner after clicking on the sign button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.once({url: '/sign/add-doc', method: 'POST'}, {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .once({url: '/sign/create-sign-request', method: 'POST'}, {
      payload: {
        relay_state: "dummy relay state",
        sign_request: "dummy sign request",
        binding: "dummy binding",
        destination_url: "https://dummy.destination.url",
        documents: [{name: 'test.pdf', id: "dummy id"}]
      }
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() => screen.getAllByTestId("little-spinner-0"));
    expect(spinner.length).to.equal(1);

    const text = await waitFor(() => screen.getAllByText("signing ..."));
    expect(text.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows error message after create sign request returns error message", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.once({url: '/sign/add-doc', method: 'POST'}, {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .once({url: '/sign/create-sign-request', method: 'POST'}, {
      message: "dummy error in create-sign-request",
      error: true
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() => screen.getAllByText("XXX Problem creating signature request"));
    expect(text.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows the spinner after create sign request returns expired cache", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .post('/sign/create-sign-request', {
      message: "expired cache",
      error: true
    })
    .post('/sign/recreate-sign-request', {
      payload: {
        relay_state: "dummy relay state",
        sign_request: "dummy sign request",
        binding: "dummy binding",
        destination_url: "https://dummy.destination.url",
        documents: [{name: 'test.pdf', id: "dummy id"}]
      }
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const spinner = await waitFor(() => screen.getAllByTestId("little-spinner-0"));
    expect(spinner.length).to.equal(1);

    const text = await waitFor(() => screen.getAllByText("signing ..."));
    expect(text.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows error message after recreate sign request returns error", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .post('/sign/create-sign-request', {
      message: "expired cache",
      error: true
    })
    .post('/sign/recreate-sign-request', {
      message: "error in recreate sign request",
      error: true
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const text = await waitFor(() => screen.getAllByText("XXX Problem creating signature request"));
    expect(text.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It carries the sign response after getting the signed docs", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .post('/sign/create-sign-request', {
      payload: {
        relay_state: "dummy relay state",
        sign_request: "dummy sign request",
        binding: "dummy binding",
        destination_url: "https://dummy.destination.url",
        documents: [{name: 'test.pdf', id: "dummy-id"}]
      }
    })
    .post('/sign/get-signed', {
      message: "documents signed",
      payload: {
        documents: [{id: "dummy-id", signed_content: "dummy signed content"}]
      }
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const signHolder = window.document.createElement('div');
    signHolder.setAttribute('id', 'sign-response-holder');
    signHolder.setAttribute('data-signresponse', 'dummy sign response');
    signHolder.setAttribute('data-relaystate', 'dummy relay state');
    const body = window.document.getElementsByTagName('body')[0];
    body.appendChild(signHolder);

    store.dispatch(loadDocuments());

    const filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    const buttonSigned = await waitFor(() => screen.getAllByText("Download (signed)"));
    expect(buttonSigned.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows error after a failure at the get-signed endpoint", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get('/sign/config', {
      payload: {
        signer_attributes: [
          {name: 'givenName', value: "Tester"},
          {name: 'surname', value: "Testig"}
        ]
      }
    });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const clearButton = await waitFor(() => screen.getAllByTestId("clear-in-header"));
    expect(clearButton.length).to.equal(1);

    fireEvent.click(clearButton[0]);
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
    fetchMock.post('/sign/add-doc', {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement"
      }
    })
    .post('/sign/create-sign-request', {
      payload: {
        relay_state: "dummy relay state",
        sign_request: "dummy sign request",
        binding: "dummy binding",
        destination_url: "https://dummy.destination.url",
        documents: [{name: 'test.pdf', id: "dummy-id"}]
      }
    })
    .post('/sign/get-signed', {
      message: "problem signing documents",
      error: true
    });

    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const selector = await waitFor(() => screen.getAllByTestId("doc-selector-0"));
    expect(selector.length).to.equal(1);

    fireEvent.click(selector[0]);
    await flushPromises(rerender, wrapped);

    const signButton = await waitFor(() => screen.getAllByText("Sign Selected Documents"));
    expect(signButton.length).to.equal(1);

    fireEvent.click(signButton[0]);
    await flushPromises(rerender, wrapped);

    const signHolder = window.document.createElement('div');
    signHolder.setAttribute('id', 'sign-response-holder');
    signHolder.setAttribute('data-signresponse', 'dummy sign response');
    signHolder.setAttribute('data-relaystate', 'dummy relay state');
    const body = window.document.getElementsByTagName('body')[0];
    body.appendChild(signHolder);

    store.dispatch(loadDocuments());

    const filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    const buttonPreview = await waitFor(() => screen.getAllByText(/Preview/i));
    expect(buttonPreview.length).to.equal(1);

    const buttonRemove = await waitFor(() => screen.getAllByText(/Remove/i));
    expect(buttonRemove.length).to.equal(1);

    const errorMsg = await waitFor(() => screen.getAllByText(/XXX Problem signing the document/i));
    expect(errorMsg.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
