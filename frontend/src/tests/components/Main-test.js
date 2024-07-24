import React from "react";
import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import {
  setupComponent,
  setupReduxComponent,
  flushPromises,
} from "tests/test-utils";
import { expect } from "chai";

import Main from "components/Main";
import { addNotification } from "slices/Notifications";
import { appLoaded } from "slices/Main";

describe("Main Component", function () {
  afterEach(cleanup);

  it("Shows splash screen", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        loading: true,
        unauthn: false,
        csrf_token: "dummy-token",
        size: "lg",
        width: 1500,
        signingData: {},
        signer_attributes: {
          eppn: "dummy@example.org",
          mail: "dummy@example.org",
          name: "Dummy name",
          mail_aliases: ["dummy@example.org"],
        },
        owned_multisign: [],
        pending_multisign: [],
        multisign_buttons: true,
        showHelp: true,
      },
    });

    try {
      const splashArray = screen.getAllByTestId("edusign-splash-screen");
      expect(splashArray.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Doesn't show splash screen", function () {
    const { unmount } = setupComponent(<Main />, {});

    try {
      const splash = screen.queryByTestId("edusign-splash-screen");
      expect(splash).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Doesn't show splash screen after appLoaded event", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(appLoaded());
      await flushPromises(rerender, wrapped);

      const splash = await waitFor(() =>
        screen.queryByTestId("edusign-splash-screen"),
      );
      expect(splash).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Displays Header", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        unauthn: false,
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
        csrf_token: "dummy-token",
        width: 1500,
        signer_attributes: {
          eppn: "dummy@example.org",
          mail: "dummy@example.org",
          name: "Dummy name",
          mail_aliases: ["dummy@example.org"],
        },
        multisign_buttons: true,
        showHelp: true,
      },
    });

    try {
      const header = screen.getAllByTestId("edusign-banner-lg");
      expect(header.length).to.equal(1);

      const eduSignLogo = screen.getAllByTestId("edusign-logo");
      expect(eduSignLogo.length).to.equal(1);

      const sunetLogo = screen.getAllByTestId("sunet-logo");
      expect(sunetLogo.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Displays Footer", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        unauthn: false,
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
        csrf_token: "dummy-token",
        width: 1500,
        signer_attributes: {
          eppn: "dummy@example.org",
          mail: "dummy@example.org",
          name: "Dummy name",
          mail_aliases: ["dummy@example.org"],
        },
        multisign_buttons: true,
        showHelp: true,
      },
    });

    try {
      const footer = screen.getAllByTestId("edusign-footer");
      expect(footer.length).to.equal(1);

      const langs = screen.getAllByTestId("language-selector");
      expect(langs.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Displays English lang selector in Footer", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        unauthn: false,
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
        csrf_token: "dummy-token",
        width: 1500,
        signer_attributes: {
          eppn: "dummy@example.org",
          mail: "dummy@example.org",
          name: "Dummy name",
          mail_aliases: ["dummy@example.org"],
        },
        multisign_buttons: true,
        showHelp: true,
      },
      intl: { locale: "sv" },
    });

    try {
      const langSelectorEn = screen.getAllByText("English");
      expect(langSelectorEn.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Clicking lang selector in Footer changes language", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

    try {
      let enText = screen.getAllByText(/Logout/);
      expect(enText.length).to.equal(1);

      let svText = screen.queryByText(/Logga ut/);
      expect(svText).to.equal(null);

      const langInput = await waitFor(() =>
        screen.getAllByTestId("language-selector"),
      );
      expect(langInput.length).to.equal(1);

      fireEvent.change(langInput[0], { target: { value: "sv" } });
      await flushPromises(rerender, wrapped);

      svText = await waitFor(() => screen.getAllByText(/Logga ut/));
      expect(svText.length).to.equal(1);

      enText = await waitFor(() => screen.queryByText("Logout"));
      expect(enText).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Contains a Notifications area", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        unauthn: false,
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
        csrf_token: "dummy-token",
        width: 1500,
        signer_attributes: {
          eppn: "dummy@example.org",
          mail: "dummy@example.org",
          name: "Dummy name",
          mail_aliases: ["dummy@example.org"],
        },
        multisign_buttons: true,
        showHelp: true,
      },
    });

    try {
      const notificationsArea = screen.getAllByTestId(
        "edusign-notifications-area",
      );
      expect(notificationsArea.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Notifications area displays notifications", function () {
    const { unmount } = setupComponent(<Main />, {
      notifications: {
        message: { level: "danger", message: "ho ho ho" },
      },
    });

    try {
      const notification = screen.getAllByText("ho ho ho");
      expect(notification.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Notifications are added to the notifications area", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        addNotification({
          message: "ho ho ho",
          level: "danger",
        }),
      );
      await flushPromises(rerender, wrapped);

      let notification = await waitFor(() => screen.getAllByText("ho ho ho"));
      expect(notification.length).to.equal(1);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Notifications are removed from the notifications area", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    try {
      store.dispatch(
        addNotification({
          message: "ho ho ho",
          level: "danger",
        }),
      );

      store.dispatch(
        addNotification({
          message: "hi hi hi",
          level: "danger",
        }),
      );
      await flushPromises(rerender, wrapped);

      let notification = await waitFor(() => screen.queryByText("ho ho ho"));
      expect(notification).to.equal(null);

      let notification2 = await waitFor(() => screen.getAllByText("hi hi hi"));
      expect(notification2.length).to.equal(1);

      const closeLink = screen.getAllByRole("button", { name: /close alert/i });
      expect(closeLink.length).to.equal(1);

      fireEvent.click(closeLink[0]);
      await flushPromises(rerender, wrapped);

      notification = await waitFor(() => screen.queryByText("ho ho ho"));
      expect(notification).to.equal(null);

      notification2 = await waitFor(() => screen.queryByText("hi hi hi"));
      expect(notification2).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });
});
