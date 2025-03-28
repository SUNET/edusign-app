import React from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect } from "chai";
import fetchMock from "fetch-mock";

import {
  setupReduxComponent,
  b64SamplePDFData,
  samplePDFData,
  flushPromises,
} from "tests/test-utils";
import Main from "components/Main";
import { createDocument, setState } from "slices/Documents";
import { fetchConfig } from "slices/Main";
import { resetDb } from "init-app/database";

describe("Multi sign invitations", function () {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    cleanup();
    fetchMock.restore();
  });

  it("It shows the invites form after clicking the invite button", async () => {
    fetchMock
      .get("/sign/config", {
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
          available_loas: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
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
      await store.dispatch(
        createDocument({
          doc: file,
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      store.dispatch(setState({ name: "test.pdf", state: "loaded" }));
      await flushPromises(rerender, wrapped);

      const button = await waitFor(() =>
        screen.getAllByText(/Invite others to sign/),
      );
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const emailInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email"),
      );
      expect(emailInput.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows two invites in form after clicking the add invitation button", async () => {
    fetchMock
      .get("/sign/config", {
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
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
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
      await store.dispatch(
        createDocument({
          doc: file,
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      store.dispatch(setState({ name: "test.pdf", state: "loaded" }));
      await flushPromises(rerender, wrapped);

      const button = await waitFor(() =>
        screen.getAllByText(/Invite others to sign/),
      );
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const buttonAdd = await waitFor(() =>
        screen.getAllByTestId("button-add-invitation"),
      );
      expect(buttonAdd.length).to.equal(1);

      fireEvent.click(buttonAdd[0]);
      await flushPromises(rerender, wrapped);

      const emailInput1 = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email"),
      );
      expect(emailInput1.length).to.equal(1);

      const emailInput2 = await waitFor(() =>
        screen.getAllByTestId("invitees.1.email"),
      );
      expect(emailInput2.length).to.equal(1);

      const nameInput1 = await waitFor(() =>
        screen.getAllByTestId("invitees.0.name"),
      );
      expect(nameInput1.length).to.equal(1);

      const nameInput2 = await waitFor(() =>
        screen.getAllByTestId("invitees.1.name"),
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
    fetchMock
      .get("/sign/config", {
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
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const fileObj = new File([samplePDFData], "testost.pdf", {
        type: "application/pdf",
      });
      const file = {
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        blob: "data:application/pdf;base64," + b64SamplePDFData,
        created: Date.now(),
      };
      await store.dispatch(
        createDocument({
          doc: file,
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      store.dispatch(setState({ name: "testost.pdf", state: "loaded" }));
      await flushPromises(rerender, wrapped);

      const filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);

      const button = await waitFor(() =>
        screen.getAllByText(/Invite others to sign/),
      );
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      let emailInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email"),
      );
      expect(emailInput.length).to.equal(1);

      fireEvent.change(emailInput[0], {
        target: { value: "dummy@example.com" },
      });

      let nameInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.name"),
      );
      expect(nameInput.length).to.equal(1);

      fireEvent.change(nameInput[0], { target: { value: "Dummy Doe" } });

      await flushPromises(rerender, wrapped);

      let langInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.lang"),
      );
      expect(langInput.length).to.equal(1);

      fireEvent.change(langInput[0], { target: { value: "en" } });

      await flushPromises(rerender, wrapped);

      const buttonSend = await waitFor(() =>
        screen.getAllByTestId("button-send-invites-testost.pdf"),
      );
      expect(buttonSend.length).to.equal(1);

      fireEvent.click(buttonSend[0]);
      await flushPromises(rerender, wrapped);

      //const inviteWaiting = await waitFor(() =>
      //screen.getAllByText(/Waiting for signatures by/)
      //);
      //expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() => screen.getAllByText(/Dummy Doe/));
      expect(inviteName.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows a template after clicking on Create template", async () => {
    fetchMock
      .get("/sign/config", {
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
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
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
      await store.dispatch(
        createDocument({
          doc: file,
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      store.dispatch(setState({ name: "testost.pdf", state: "loaded" }));
      await flushPromises(rerender, wrapped);

      let filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);

      const dropdownButton = await waitFor(() =>
        screen.getAllByText(/Other options/),
      );
      expect(dropdownButton.length).to.equal(1);

      fireEvent.click(dropdownButton[0]);
      await flushPromises(rerender, wrapped);

      const button = await waitFor(() =>
        screen.getAllByText(/Create template/),
      );
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const templates = await waitFor(() => screen.getAllByText("Templates"));
      expect(templates.length).to.equal(1);

      filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("From template make a copy and check the name of the copy", async () => {
    fetchMock
      .get("/sign/config", {
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
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
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
      await store.dispatch(
        createDocument({
          doc: file,
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      store.dispatch(setState({ name: "testost.pdf", state: "loaded" }));
      await flushPromises(rerender, wrapped);

      let filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);

      let dropdownButton = await waitFor(() =>
        screen.getAllByText(/Other options/),
      );
      expect(dropdownButton.length).to.equal(1);

      fireEvent.click(dropdownButton[0]);
      await flushPromises(rerender, wrapped);

      let button = await waitFor(() => screen.getAllByText(/Create template/));
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const templates = await waitFor(() => screen.getAllByText("Templates"));
      expect(templates.length).to.equal(1);

      filename = await waitFor(() => screen.getAllByText("testost.pdf"));
      expect(filename.length).to.equal(1);

      button = await waitFor(() =>
        screen.getAllByText(/Invite others to sign/),
      );
      expect(button.length).to.equal(1);

      fireEvent.click(button[0]);
      await flushPromises(rerender, wrapped);

      const emailInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.email"),
      );
      expect(emailInput.length).to.equal(1);

      fireEvent.change(emailInput[0], {
        target: { value: "dummy-2@example.com" },
      });

      const nameInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.name"),
      );
      expect(nameInput.length).to.equal(1);

      fireEvent.change(nameInput[0], { target: { value: "Dummy-2 Doe" } });

      await flushPromises(rerender, wrapped);

      const langInput = await waitFor(() =>
        screen.getAllByTestId("invitees.0.lang"),
      );
      expect(langInput.length).to.equal(1);

      fireEvent.change(langInput[0], { target: { value: "en" } });

      await flushPromises(rerender, wrapped);

      const buttonSend = await waitFor(() =>
        screen.getAllByTestId("button-send-invites-testost.pdf"),
      );
      expect(buttonSend.length).to.equal(1);

      fireEvent.click(buttonSend[0]);
      await flushPromises(rerender, wrapped);

      const filenameCopy = await waitFor(() =>
        screen.getAllByText("testost-1.pdf"),
      );
      expect(filenameCopy.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Dummy-2 Doe/),
      );
      expect(inviteName.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation", async () => {
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              declined: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.queryAllByText(/Signed by/),
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
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              state: "incomplete",
              name: "test1.pdf",
              type: "application/pdf",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              created: 1685976828240,
              signed: [],
              declined: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                  lang: "en",
                },
              ],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      let resendLabel = await waitFor(() =>
        screen.queryAllByText(/Send reminders to people pending to sign/),
      );
      expect(resendLabel.length).to.equal(0);

      const dropdownButton = await waitFor(() =>
        screen.getAllByText(/Other options/),
      );
      expect(dropdownButton.length).to.equal(1);

      fireEvent.click(dropdownButton[0]);
      await flushPromises(rerender, wrapped);

      const openResendButton = await waitFor(() =>
        screen.getAllByTestId("menu-item-open-resend-test1.pdf"),
      );
      expect(openResendButton.length).to.equal(1);

      fireEvent.click(openResendButton[0]);
      await flushPromises(rerender, wrapped);

      resendLabel = await waitFor(() =>
        screen.queryAllByText(/Send reminders to people pending to sign/),
      );
      expect(resendLabel.length).to.equal(1);

      const resendButton = await waitFor(() =>
        screen.getAllByTestId("button-resend-test1.pdf"),
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
        screen.getAllByText(/Success resending invitations to sign/),
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
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              declined: [],
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      let resendLabel = await waitFor(() =>
        screen.queryAllByText(/Send reminders to people pending to sign/),
      );
      expect(resendLabel.length).to.equal(0);

      const dropdownButton = await waitFor(() =>
        screen.getAllByText(/Other options/),
      );
      expect(dropdownButton.length).to.equal(1);

      fireEvent.click(dropdownButton[0]);
      await flushPromises(rerender, wrapped);

      const openResendButton = await waitFor(() =>
        screen.getAllByTestId("menu-item-open-resend-test1.pdf"),
      );
      expect(openResendButton.length).to.equal(1);

      fireEvent.click(openResendButton[0]);
      await flushPromises(rerender, wrapped);

      resendLabel = await waitFor(() =>
        screen.queryAllByText(/Send reminders to people pending to sign/),
      );
      expect(resendLabel.length).to.equal(1);

      let resendButton = await waitFor(() =>
        screen.getAllByTestId("button-resend-test1.pdf"),
      );
      expect(resendButton.length).to.equal(1);

      let cancelButton = await waitFor(() =>
        screen.getAllByTestId("button-cancel-resend-test1.pdf"),
      );
      expect(cancelButton.length).to.equal(1);

      fireEvent.click(cancelButton[0]);
      await flushPromises(rerender, wrapped);

      // resendLabel = await waitFor(() =>
      //  screen.queryAllByText(/Send reminders to people pending to sign/)
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
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [],
              declined: [],
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
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.queryAllByText(/Signed by/),
      );
      expect(signedWaiting.length).to.equal(0);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/),
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
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              signed: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
              declined: [],
              pending: [
                {
                  name: "Tester Invited2",
                  email: "invited2@example.org",
                },
              ],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Signed by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/),
      );
      expect(invite2Name.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation with 2 invitees, both signed", async () => {
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
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
              declined: [],
              pending: [],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const inviteWaiting = await waitFor(() =>
        screen.queryAllByText(/Waiting for signatures by/),
      );
      expect(inviteWaiting.length).to.equal(0);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Signed by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const invite2Name = await waitFor(() =>
        screen.getAllByText(/Tester Invited2/),
      );
      expect(invite2Name.length).to.equal(1);

      const signButton = await waitFor(() =>
        screen.getAllByText(/Sign selected documents/),
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
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
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
              declined: [],
              pending: [],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .post("/sign/remove-multi-sign", {
        error: false,
        message: "Success removing invitation",
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const rmButton = await waitFor(() =>
        screen.getAllByTestId(
          "button-rm-invitation-11111111-1111-1111-1111-111111111111",
        ),
      );
      expect(rmButton.length).to.equal(1);

      fireEvent.click(rmButton[0]);
      await flushPromises(rerender, wrapped);

      const confirmButton2 = await waitFor(() =>
        screen.getAllByTestId("confirm-remove-test1.pdf-confirm-button"),
      );
      expect(confirmButton2.length).to.equal(1);

      fireEvent.click(confirmButton2[0]);
      await flushPromises(rerender, wrapped);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It cancels removing multisign invitation", async () => {
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
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
              declined: [],
              pending: [],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .post("/sign/remove-multi-sign", {
        error: false,
        message: "Success removing invitation",
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const rmButton = await waitFor(() =>
        screen.getAllByTestId(
          "button-rm-invitation-11111111-1111-1111-1111-111111111111",
        ),
      );
      expect(rmButton.length).to.equal(1);

      fireEvent.click(rmButton[0]);
      await flushPromises(rerender, wrapped);

      const confirmButton2 = await waitFor(() =>
        screen.getAllByTestId("confirm-remove-test1.pdf-cancel-button"),
      );
      expect(confirmButton2.length).to.equal(1);

      fireEvent.click(confirmButton2[0]);
      await flushPromises(rerender, wrapped);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          available_loas: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              pending: [],
              signed: [],
              declined: [],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Invited by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Inviter/),
      );
      expect(inviteName.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows insecured invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          available_loas: [
            { name: "Low", value: "low" },
            { name: "Medium", value: "medium" },
            { name: "High", value: "high" },
          ],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "failed-loa",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              loa: "high",
              message: "You don't provide the required securiry level",
              pending: [],
              signed: [],
              declined: [],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const errorMessage = await waitFor(() =>
        screen.getAllByText(/You don't provide the required securiry level/),
      );
      expect(errorMessage.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Inviter/),
      );
      expect(inviteName.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows secured invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          available_loas: [
            { name: "Low", value: "low" },
            { name: "Medium", value: "medium" },
            { name: "High", value: "high" },
          ],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              loa: "high,High",
              pending: [],
              signed: [],
              declined: [],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const loaLevel = await waitFor(() =>
        screen.getAllByText(/Required security level/),
      );
      expect(loaLevel.length).to.equal(1);

      const level = await waitFor(() => screen.getAllByText(/High/));
      expect(level.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It starts final signature of multisigned doc", async () => {
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              created: "1668768051000.0",
              type: "application/pdf",
              state: "loaded",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              loa: "low",
              prev_signatures: "",
              signed: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                  lang: "en",
                },
                {
                  name: "Tester Invited2",
                  email: "invited2@example.org",
                  lang: "en",
                },
              ],
              declined: [],
              pending: [],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .post("/sign/recreate-sign-request", {
        payload: {
          failed: [],
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [
            {
              name: "test1.pdf",
              key: "11111111-1111-1111-1111-111111111111",
            },
          ],
        },
        error: false,
      })
      .post("/sign/create-sign-request", {
        payload: {
          failed: [],
          relay_state: "dummy relay state",
          sign_request: "dummy sign request",
          binding: "dummy binding",
          destination_url: "https://dummy.destination.url",
          documents: [
            {
              name: "test1.pdf",
              key: "11111111-1111-1111-1111-111111111111",
            },
          ],
        },
        error: false,
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      //store.dispatch(setState({ name: "test1.pdf", state: "selected" }));
      //await flushPromises(rerender, wrapped);

      const selector = await waitFor(() =>
        screen.getAllByTestId(
          "doc-selector-11111111-1111-1111-1111-111111111111",
        ),
      );
      expect(selector.length).to.equal(1);

      fireEvent.click(selector[0]);
      await flushPromises(rerender, wrapped);

      const signButton = await waitFor(() =>
        screen.getAllByText(/Sign selected documents/),
      );
      expect(signButton.length).to.equal(1);

      fireEvent.click(signButton[0]);
      await flushPromises(rerender, wrapped);

      const inviteForm = await waitFor(() =>
        screen.getAllByTestId("signing-form"),
      );
      expect(inviteForm.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It skips final signature of multisigned doc", async () => {
    fetchMock
      .get("/sign/config", {
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
          owned_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
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
              declined: [],
              pending: [],
            },
          ],
          pending_multisign: [],
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
        },
      })
      .post("/sign/skip-final-signature", {
        payload: {
          documents: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              signed_content: "dummy signed content",
            },
          ],
        },
        csrf_token:
          "2dHK9eEX$8be8af38c0ca02a0be346df372d43a65dbefdbed757a4d43a770e793aed4d02b",
        message: "Success",
        error: false,
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const skipButton = await waitFor(() =>
        screen.getAllByText(/Skip Signature/),
      );
      expect(skipButton.length).to.equal(1);

      fireEvent.click(skipButton[0]);
      await flushPromises(rerender, wrapped);

      const dlButton = await waitFor(() =>
        screen.getAllByTestId("button-download-signed-test1.pdf"),
      );
      expect(dlButton.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows other invitees pending to sign in invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              pending: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
              signed: [],
              declined: [],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const inviteEmail = await waitFor(() =>
        screen.getAllByText(/invited1@example.org/),
      );
      expect(inviteEmail.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows other already signed invitees in invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "loaded",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              signed: [
                {
                  name: "Tester Invited1",
                  email: "invited1@example.org",
                },
              ],
              declined: [],
              pending: [],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Signed by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Invited1/),
      );
      expect(inviteName.length).to.equal(1);

      const inviteEmail = await waitFor(() =>
        screen.getAllByText(/invited1@example.org/),
      );
      expect(inviteEmail.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });

  it("It shows both pending and already signed invitees in invitation for us", async () => {
    fetchMock
      .get("/sign/config", {
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
          skipped: [],
          ui_defaults: { sendsigned: true, skip_final: true },
          available_loas: [],
          pending_multisign: [
            {
              name: "test1.pdf",
              type: "application/pdf",
              state: "incomplete",
              size: 1500,
              key: "11111111-1111-1111-1111-111111111111",
              invite_key: "22222222-2222-2222-2222-222222222222",
              owner: {
                name: "Tester Inviter",
                email: "inviter@example.org",
              },
              signed: [
                {
                  name: "Tester Signed",
                  email: "invited1@example.org",
                },
              ],
              declined: [],
              pending: [
                {
                  name: "Tester Pending",
                  email: "invited2@example.org",
                },
              ],
            },
          ],
        },
      })
      .get("/sign/poll", {});
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        fetchConfig({
          intl: { formatMessage: ({ defaultMessage, id }) => defaultMessage },
        }),
      );
      await flushPromises(rerender, wrapped);

      const signedWaiting = await waitFor(() =>
        screen.getAllByText(/Signed by/),
      );
      expect(signedWaiting.length).to.equal(1);

      const inviteName = await waitFor(() =>
        screen.getAllByText(/Tester Signed/),
      );
      expect(inviteName.length).to.equal(1);

      const inviteEmail = await waitFor(() =>
        screen.getAllByText(/invited1@example.org/),
      );
      expect(inviteEmail.length).to.equal(1);

      const signedWaiting2 = await waitFor(() =>
        screen.getAllByText(/Waiting for signatures by/),
      );
      expect(signedWaiting2.length).to.equal(1);

      const inviteName2 = await waitFor(() =>
        screen.getAllByText(/Tester Pending/),
      );
      expect(inviteName2.length).to.equal(1);

      const inviteEmail2 = await waitFor(() =>
        screen.getAllByText(/invited2@example.org/),
      );
      expect(inviteEmail2.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }
    // if we don't unmount here, mounted components (DocPreview) leak to other tests
    unmount();
  });
});
