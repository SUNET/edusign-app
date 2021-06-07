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

    try {
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
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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
      fetchMock.post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          key: "dummy key",
          sign_requirement: "dummy sign requirement",
        },
      });
      store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
      await flushPromises(rerender, wrapped);

      const button = await waitFor(() => screen.getAllByTestId("button-multisign-0"));
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const emailInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email")
      );
      expect(emailInput.length).to.equal(2);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows two invites in form after clicking the add invitation button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
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
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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
      fetchMock.post("/sign/add-doc", {
        message: "document added",
        payload: {
          ref: "dummy ref",
          sign_requirement: "dummy sign requirement",
        },
      });
      store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
      await flushPromises(rerender, wrapped);

      const button = await waitFor(() => screen.getAllByTestId("button-multisign-0"));
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const buttonAdd = await waitFor(() =>
        screen.getAllByTestId("button-add-invitation-test.pdf")
      );
      expect(buttonAdd.length).to.equal(1);

      fireEvent.click(buttonAdd[0]);
      await flushPromises(rerender, wrapped);

      const emailInput1 = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email")
      );
      expect(emailInput1.length).to.equal(1);

      const emailInput2 = await waitFor(() =>
        screen.getAllByTestId("invitees.1.email")
      );
      expect(emailInput2.length).to.equal(1);

      const nameInput1 = await waitFor(() =>
        screen.getAllByTestId("invitees.0.name")
      );
      expect(nameInput1.length).to.equal(1);

      const nameInput2 = await waitFor(() =>
        screen.getAllByTestId("invitees.1.name")
      );
      expect(nameInput2.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows no invites form after clicking the send button", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock
        .get("/sign/config", {
          payload: {
            signer_attributes: [
              { name: "mail", value: "tester@example.org" },
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
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const fileObj = new File([samplePDFData], "testost.pdf", {
        type: "application/pdf",
      });
      const file = {
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        blob: "data:application/pdf;base64," + b64SamplePDFData,
      };
      store.dispatch(createDocument({doc: file, intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
      await flushPromises(rerender, wrapped);

      const filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);

      const button = await waitFor(() => screen.getAllByTestId("button-multisign-0"));
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      let emailInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email")
      );
      expect(emailInput.length).to.equal(1);

      fireEvent.change(emailInput[0], { target: { value: "dummy@example.com" } });

      let nameInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.name")
      );
      expect(nameInput.length).to.equal(1);

      fireEvent.change(nameInput[0], { target: { value: "Dummy Doe" } });

      await flushPromises(rerender, wrapped);

      const buttonSend = await waitFor(() =>
        screen.getAllByTestId("button-send-invites-testost.pdf")
      );
      expect(buttonSend.length).to.equal(1);

      fireEvent.click(buttonSend[0]);
      await flushPromises(rerender, wrapped);

      rerender();

      emailInput = await waitFor(() =>
        screen.queryAllByTestId("invitees.0.email")
      );
      expect(emailInput.length).to.equal(0);

      nameInput = await waitFor(() => screen.queryAllByTestId("invitees.0.name"));
      expect(nameInput.length).to.equal(0);

      const inviteTitle = await waitFor(() =>
        screen.getAllByText("Requests for multiple signatures:")
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText("Waiting for signatures by:")
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() => screen.getAllByText(/Dummy Doe/));
      expect(inviteName.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.queryAllByText(/Already signed by/)
      );
      expect(signedWaiting.length).to.equal(0);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It resends invitations", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      let resendLabel = await waitFor(() =>
        screen.queryAllByText(/Resend invitation to people pending to sign/)
      );
      expect(resendLabel.length).to.equal(0);

      const openResendButton = await waitFor(() =>
        screen.getAllByTestId("button-open-resend-test1.pdf")
      );
      expect(openResendButton.length).to.equal(1);

      fireEvent.click(openResendButton[0]);
      await flushPromises(rerender, wrapped);

      resendLabel = await waitFor(() =>
        screen.getAllByText(/Resend invitation to people pending to sign/)
      );
      expect(resendLabel.length).to.equal(1);

      const resendButton = await waitFor(() =>
        screen.getAllByTestId("button-resend-test1.pdf")
      );
      expect(resendButton.length).to.equal(1);

      fetchMock.post("/sign/send-multisign-reminder", {
        csrf_token: "dummy token",
        error: false,
        message: "Success resending invitations to sign",
      });

      fireEvent.click(resendButton[0]);
      await flushPromises(rerender, wrapped);

      const message = await waitFor(() =>
        screen.getAllByText(/Success resending invitations to sign/)
      );
      expect(message.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It cancels resending invitations", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      let resendLabel = await waitFor(() =>
        screen.queryAllByText(/Resend invitation to people pending to sign/)
      );
      expect(resendLabel.length).to.equal(0);

      const openResendButton = await waitFor(() =>
        screen.getAllByTestId("button-open-resend-test1.pdf")
      );
      expect(openResendButton.length).to.equal(1);

      fireEvent.click(openResendButton[0]);
      await flushPromises(rerender, wrapped);

      resendLabel = await waitFor(() =>
        screen.getAllByText(/Resend invitation to people pending to sign/)
      );
      expect(resendLabel.length).to.equal(1);

      let resendButton = await waitFor(() =>
        screen.getAllByTestId("button-resend-test1.pdf")
      );
      expect(resendButton.length).to.equal(1);

      let cancelButton = await waitFor(() =>
        screen.getAllByTestId("button-cancel-resend-test1.pdf")
      );
      expect(cancelButton.length).to.equal(1);

      fireEvent.click(cancelButton[0]);
      await flushPromises(rerender, wrapped);

      // resendLabel = await waitFor(() =>
      //   screen.getAllByText(/Resend invitation to people pending to sign/)
      // );
      // expect(resendLabel.length).to.equal(0);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation with 2 invitees", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
                {
                  name: "Tester Invited2",
                  email: "invited2@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.queryAllByText(/Already signed by/)
      );
      expect(signedWaiting.length).to.equal(0);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/)
      );
      expect(invite2Name.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation with 2 invitees, one signed", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
              pending: [
                {
                  name: "Tester Invited2",
                  email: "invited2@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Already signed by/)
      );
      expect(signedWaiting.length).to.equal(1);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/)
      );
      expect(invite2Name.length).to.equal(1);

      const signButton = await waitFor(() =>
        screen.queryAllByText(/Add Final Signature/)
      );
      expect(signButton.length).to.equal(0);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation with 2 invitees, both signed", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
                {
                  name: "Tester Invited2",
                  email: "invited2@example.org",
                },
              ],
              pending: [],
            },
          ],
          pending_multisign: [],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.getAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const inviteWaiting = await waitFor(() =>
        screen.queryAllByText(/Waiting for signatures by/)
      );
      expect(inviteWaiting.length).to.equal(0);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/)
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Already signed by/)
      );
      expect(signedWaiting.length).to.equal(1);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/)
      );
      expect(invite2Name.length).to.equal(1);

      const signButton = await waitFor(() =>
        screen.getAllByText(/Add Final Signature/)
      );
      expect(signButton.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It removes multisign invitation", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock
        .get("/sign/config", {
          payload: {
            signer_attributes: [
              { name: "givenName", value: "Tester" },
              { name: "surname", value: "Testig" },
            ],
            owned_multisign: [
              {
                name: "test1.pdf",
                type: "application/pdf",
                size: 1500,
                key: "11111111-1111-1111-1111-111111111111",
                signed: [
                  {
                    name: "Tester Invited1",
                    email: "invited1@example.org",
                  },
                  {
                    name: "Tester Invited2",
                    email: "invited2@example.org",
                  },
                ],
                pending: [],
              },
            ],
            pending_multisign: [],
          },
        })
        .post("/sign/remove-multi-sign", {
          error: false,
          message: "Success removing invitation",
        });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const rmButton = await waitFor(() =>
        screen.getAllByTestId("rm-invitation-test1.pdf")
      );
      expect(rmButton.length).to.equal(1);

      fireEvent.click(rmButton[0]);
      await flushPromises(rerender, wrapped);

      let inviteTitle = await waitFor(() =>
        screen.queryAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const confirmButton2 = await waitFor(() =>
        screen.getAllByTestId("confirm-remove-owned-confirm-button")
      );
      expect(confirmButton2.length).to.equal(1);

      fireEvent.click(confirmButton2[0]);
      await flushPromises(rerender, wrapped);

      inviteTitle = await waitFor(() =>
        screen.queryAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(0);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It cancels removing multisign invitation", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock
        .get("/sign/config", {
          payload: {
            signer_attributes: [
              { name: "givenName", value: "Tester" },
              { name: "surname", value: "Testig" },
            ],
            owned_multisign: [
              {
                name: "test1.pdf",
                type: "application/pdf",
                size: 1500,
                key: "11111111-1111-1111-1111-111111111111",
                signed: [
                  {
                    name: "Tester Invited1",
                    email: "invited1@example.org",
                  },
                  {
                    name: "Tester Invited2",
                    email: "invited2@example.org",
                  },
                ],
                pending: [],
              },
            ],
            pending_multisign: [],
          },
        })
        .post("/sign/remove-multi-sign", {
          error: false,
          message: "Success removing invitation",
        });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const rmButton = await waitFor(() =>
        screen.getAllByTestId("rm-invitation-test1.pdf")
      );
      expect(rmButton.length).to.equal(1);

      fireEvent.click(rmButton[0]);
      await flushPromises(rerender, wrapped);

      let inviteTitle = await waitFor(() =>
        screen.queryAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);

      const confirmButton2 = await waitFor(() =>
        screen.getAllByTestId("confirm-remove-owned-cancel-button")
      );
      expect(confirmButton2.length).to.equal(1);

      fireEvent.click(confirmButton2[0]);
      await flushPromises(rerender, wrapped);

      inviteTitle = await waitFor(() =>
        screen.queryAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation for us", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock.get("/sign/config", {
        payload: {
          signer_attributes: [
            { name: "givenName", value: "Tester" },
            { name: "surname", value: "Testig" },
          ],
          owned_multisign: [],
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              pending: [],
            },
          ],
        },
      });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const inviteTitle = await waitFor(() =>
        screen.queryAllByText(/Requests for multiple signatures/)
      );
      expect(inviteTitle.length).to.equal(0);

      const invitedTitle = await waitFor(() =>
        screen.getAllByText(/Invitations to sign/)
      );
      expect(invitedTitle.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Invited by/)
      );
      expect(signedWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Inviter/)
      );
      expect(inviteName.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It starts final signature of multisigned doc", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      fetchMock
        .get("/sign/config", {
          payload: {
            signer_attributes: [
              { name: "givenName", value: "Tester" },
              { name: "surname", value: "Testig" },
            ],
            owned_multisign: [
              {
                name: "test1.pdf",
                type: "application/pdf",
                size: 1500,
                key: "11111111-1111-1111-1111-111111111111",
                signed: [
                  {
                    name: "Tester Invited1",
                    email: "invited1@example.org",
                  },
                  {
                    name: "Tester Invited2",
                    email: "invited2@example.org",
                  },
                ],
                pending: [],
              },
            ],
            pending_multisign: [],
          },
        })
        .post("/sign/final-sign-request", {
          payload: {
            relay_state: "dummy relay state",
            sign_request: "dummy sign request",
            binding: "dummy binding",
            destination_url: "https://dummy.destination.url",
            documents: [
              { name: "test1.pdf", key: "11111111-1111-1111-1111-111111111111" },
            ],
          },
        });
      store.dispatch(fetchConfig({intl: {formatMessage: ({defaultMessage, id}) => defaultMessage}}));
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

      const signButton = await waitFor(() =>
        screen.getAllByText(/Add Final Signature/)
      );
      expect(signButton.length).to.equal(1);

      fireEvent.click(signButton[0]);
      await flushPromises(rerender, wrapped);

      const inviteForm = await waitFor(() =>
        screen.queryAllByTestId("signing-form")
      );
      expect(inviteForm.length).to.equal(1);


    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
