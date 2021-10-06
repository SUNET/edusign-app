import React from "react";
import {
  act,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
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
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
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
        screen.queryByTestId("edusign-splash-screen")
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
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
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
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
      },
    });

    try {
      const footer = screen.getAllByTestId("edusign-footer");
      expect(footer.length).to.equal(1);

      const langSelectorSv = screen.getAllByText("Svenska");
      expect(langSelectorSv.length).to.equal(1);

      const langSelectorEn = screen.queryByText("English");
      expect(langSelectorEn).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Displays English lang selector in Footer", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
      },
      intl: { locale: "sv" },
    });

    try {
      const langSelectorEn = screen.getAllByText("English");
      expect(langSelectorEn.length).to.equal(1);

      const langSelectorSv = screen.queryByText("Svenska");
      expect(langSelectorSv).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Clicking lang selector in Footer changes language", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

    try {
      let langSelectorSv = screen.getAllByText("Svenska");
      expect(langSelectorSv.length).to.equal(1);

      let langSelectorEn = screen.queryByText("English");
      expect(langSelectorEn).to.equal(null);

      fireEvent.click(langSelectorSv[0]);
      await flushPromises(rerender, wrapped);

      langSelectorEn = await waitFor(() => screen.getAllByText("English"));
      expect(langSelectorEn.length).to.equal(1);

      langSelectorSv = await waitFor(() => screen.queryByText("Svenska"));
      expect(langSelectorSv).to.equal(null);
    } catch (err) {
      unmount();
      throw err;
    }

    unmount();
  });

  it("Contains a Notifications area", function () {
    const { unmount } = setupComponent(<Main />, {
      main: {
        loading: false,
        size: "lg",
        signingData: {},
        owned_multisign: [],
        pending_multisign: [],
      },
    });

    try {
      const notificationsArea = screen.getAllByTestId(
        "edusign-notifications-area"
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
        })
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
        })
      );

      store.dispatch(
        addNotification({
          message: "hi hi hi",
          level: "danger",
        })
      );
      await flushPromises(rerender, wrapped);

      let notification = await waitFor(() => screen.queryByText("ho ho ho"));
      expect(notification).to.equal(null);

      let notification2 = await waitFor(() => screen.getAllByText("hi hi hi"));
      expect(notification2.length).to.equal(1);

      const closeLink = screen.getAllByText("×");
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
