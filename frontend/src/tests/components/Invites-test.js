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
        key: "dummy key",
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

    const title = await waitFor(() => screen.getAllByText(/Invite people to sign/i));
    expect(title.length).to.equal(1);

    const emailInput = await waitFor(() => screen.getAllByTestId(/invitees.0.email/i));
    expect(emailInput.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows two invites form after clicking the add invitation button", async () => {
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

    const buttonAdd = await waitFor(() => screen.getAllByText(/Add Invitation/i));
    expect(buttonAdd.length).to.equal(1);

    fireEvent.click(buttonAdd[0]);
    await flushPromises(rerender, wrapped);

    const emailInput1 = await waitFor(() => screen.getAllByTestId(/invitees.0.email/i));
    expect(emailInput1.length).to.equal(1);

    const emailInput2 = await waitFor(() => screen.getAllByTestId(/invitees.1.email/i));
    expect(emailInput2.length).to.equal(1);

    const nameInput1 = await waitFor(() => screen.getAllByTestId(/invitees.0.name/i));
    expect(nameInput1.length).to.equal(1);

    const nameInput2 = await waitFor(() => screen.getAllByTestId(/invitees.1.name/i));
    expect(nameInput2.length).to.equal(1);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows no invites form after clicking the send button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);
    fetchMock
      .get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [],
          pending_multisign: [],
        },
      })
      .post("/sign/add-doc", {
        message: "document added",
        payload: {
          key: "dummy key",
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      })
      .post("/sign/create-multi-sign", {
        message: "Success creating multi signature request",
        error: false,
      });
    store.dispatch(fetchConfig());
    await flushPromises(rerender, wrapped);

    const fileObj = new File([samplePDFData], "testost.pdf", {
      type: "application/pdf",
    });
    const file = {
      name: fileObj.name,
      size: fileObj.size,
      type: fileObj.type,
      blob: "data:application/pdf;base64," + b64SamplePDFData,
    };
    store.dispatch(createDocument(file));
    await flushPromises(rerender, wrapped);

    const filename = await waitFor(() => screen.getAllByText(/testost.pdf/i));
    expect(filename.length).to.equal(1);

    const button = await waitFor(() => screen.getAllByText(/Multi sign/i));
    expect(button.length).to.equal(1);

    fireEvent.click(button[0]);
    await flushPromises(rerender, wrapped);

    let emailInput = await waitFor(() => screen.getAllByTestId(/invitees.0.email/i));
    expect(emailInput.length).to.equal(1);

    fireEvent.change(emailInput[0], {target: {value: "dummy@example.com"}});

    let nameInput = await waitFor(() => screen.getAllByTestId(/invitees.0.name/i));
    expect(nameInput.length).to.equal(1);

    fireEvent.change(nameInput[0], {target: {value: "Dummy Doe"}});

    await flushPromises(rerender, wrapped);

    const buttonSend = await waitFor(() => screen.getAllByText(/Send/i));
    expect(buttonSend.length).to.equal(1);

    fireEvent.click(buttonSend[0]);
    await flushPromises(rerender, wrapped);

    rerender();

    emailInput = await waitFor(() => screen.queryAllByTestId("invitees.0.email"));
    expect(emailInput.length).to.equal(0);

    nameInput = await waitFor(() => screen.queryAllByTestId("invitees.0.name"));
    expect(nameInput.length).to.equal(0);

    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
