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
    const { unmount } = setupComponent(<Main />, {});

    const splashArray = screen.getAllByTestId("edusign-splash-screen");
    expect(splashArray.length).to.equal(1);

    unmount();
  });

  it("Doesn't show splash screen", function () {
    const { unmount } = setupComponent(<Main />, { main: { loading: false } });

    const splash = screen.queryByTestId("edusign-splash-screen");
    expect(splash).to.equal(null);

    unmount();
  });

  it("Doesn't show splash screen after appLoaded event", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    store.dispatch(appLoaded());
    await flushPromises(rerender, wrapped);

    const splash = await waitFor(() =>
      screen.queryByTestId("edusign-splash-screen")
    );
    expect(splash).to.equal(null);

    unmount();
  });

  it("Displays Header", function () {
    const { unmount } = setupComponent(<Main />, { main: { loading: false } });

    const header = screen.getAllByTestId("edusign-banner");
    expect(header.length).to.equal(1);

    const eduSignLogo = screen.getAllByTestId("edusign-logo");
    expect(eduSignLogo.length).to.equal(1);

    const sunetLogo = screen.getAllByTestId("sunet-logo");
    expect(sunetLogo.length).to.equal(1);

    unmount();
  });

  it("Displays Footer", function () {
    const { unmount } = setupComponent(<Main />, { main: { loading: false } });

    const footer = screen.getAllByTestId("edusign-footer");
    expect(footer.length).to.equal(1);

    const copyright = screen.getAllByText("SUNET 2020", { exact: false });
    expect(copyright.length).to.equal(1);

    const langSelectorSv = screen.getAllByText("Svenska");
    expect(langSelectorSv.length).to.equal(1);

    const langSelectorEn = screen.queryByText("English");
    expect(langSelectorEn).to.equal(null);

    unmount();
  });

  it("Displays English lang selector in Footer", function () {
    const { unmount } = setupComponent(<Main />, {
      main: { loading: false },
      intl: { locale: "sv" },
    });

    const langSelectorEn = screen.getAllByText("English");
    expect(langSelectorEn.length).to.equal(1);

    const langSelectorSv = screen.queryByText("Svenska");
    expect(langSelectorSv).to.equal(null);

    unmount();
  });

  it("Clicking lang selector in Footer changes language", async () => {
    const { wrapped, rerender, unmount } = setupReduxComponent(<Main />);

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

    unmount();
  });

  it("Contains a Notifications area", function () {
    const { unmount } = setupComponent(<Main />, { main: { loading: false } });

    const notificationsArea = screen.getAllByTestId(
      "edusign-notifications-area"
    );
    expect(notificationsArea.length).to.equal(1);

    unmount();
  });

  it("Notifications area displays notifications", function () {
    const { unmount } = setupComponent(<Main />, {
      main: { loading: false },
      notifications: { notification: { level: "danger", message: "ho ho ho" } },
    });

    const notification = screen.getAllByText("ho ho ho");
    expect(notification.length).to.equal(1);

    unmount();
  });

  it("Notifications are removed from the notifications area", async () => {
    const { wrapped, rerender, store, unmount } = setupReduxComponent(<Main />);

    store.dispatch(
      addNotification({
        message: "ho ho ho",
        level: "danger",
      })
    );
    await flushPromises(rerender, wrapped);

    let notification = await waitFor(() => screen.getAllByText("ho ho ho"));
    expect(notification.length).to.equal(1);

    const closeLink = screen.getAllByText("×");
    expect(closeLink.length).to.equal(1);

    fireEvent.click(closeLink[0]);
    await flushPromises(rerender, wrapped);

    notification = await waitFor(() => screen.queryByText("ho ho ho"));
    expect(notification).to.equal(null);

    unmount();
  });
});
