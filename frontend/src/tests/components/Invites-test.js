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

describe("Multi sign invitations", function () {
  afterEach(() => {
    cleanup();
    fetchMock.restore();
  });

  it("It shows the invites form after clicking the invite button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock.get("/sign/config", {
      payload: {
        signer_attributes: [
          { name: "givenName", value: "Tester" },
          { name: "surname", value: "Testig" },
        ],
        owned_multisign: [],
        pending_multisign: [],
      },
    });
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
    };
    fetchMock.post("/sign/add-doc", {
      message: "document added",
      payload: {
        ref: "dummy ref",
        sign_requirement: "dummy sign requirement",
      },
    });
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const filename = await waitFor(() => screen.getAllByText(/test.pdf/i));
    expect(filename.length).to.equal(1);

    const button = await waitFor(() => screen.getAllByText(/Multi sign/i));
    expect(button.length).to.equal(1);

    fireEvent.click(button[0]);
    await flushPromises(rerender, wrapped);

    const title = await waitFor(() => screen.getAllByText(/Invite people to sign document/i));
    expect(title.length).to.equal(1);

    fetchMock.restore();

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
