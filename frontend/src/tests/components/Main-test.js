import React from "react";
import {
  act,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { setupComponent, setupReduxComponent } from "tests/test-utils";
import { expect } from "chai";

import Main from "components/Main";

describe("Main Component", function () {
  afterEach(cleanup);

  it("Shows splash screen", function () {
    setupComponent(<Main />, {});

    const splashArray = screen.getAllByTestId("edusign-splash-screen");
    expect(splashArray.length).to.equal(1);
  });

  it("Doesn't show splash screen", function () {
    setupComponent(<Main />, { main: { loading: false } });

    const splash = screen.queryByTestId("edusign-splash-screen");
    expect(splash).to.equal(null);
  });

  it("Displays Header", function () {
    setupComponent(<Main />, { main: { loading: false } });

    const header = screen.getAllByTestId("edusign-banner");
    expect(header.length).to.equal(1);

    const eduSignLogo = screen.getAllByTestId("edusign-logo");
    expect(eduSignLogo.length).to.equal(1);

    const sunetLogo = screen.getAllByTestId("sunet-logo");
    expect(sunetLogo.length).to.equal(1);

    const tagline = screen.getAllByText("Welcome to eduSign");
    expect(tagline.length).to.equal(1);
  });

  it("Displays Footer", function () {
    setupComponent(<Main />, { main: { loading: false } });

    const footer = screen.getAllByTestId("edusign-footer");
    expect(footer.length).to.equal(1);

    const copyright = screen.getAllByText("SUNET 2020", { exact: false });
    expect(copyright.length).to.equal(1);

    const langSelectorSv = screen.getAllByText("Svenska");
    expect(langSelectorSv.length).to.equal(1);

    const langSelectorEn = screen.queryByText("English");
    expect(langSelectorEn).to.equal(null);
  });

  it("Displays English lang selector in Footer", function () {
    setupComponent(<Main />, {
      main: { loading: false },
      intl: { locale: "sv" },
    });

    const langSelectorEn = screen.getAllByText("English");
    expect(langSelectorEn.length).to.equal(1);

    const langSelectorSv = screen.queryByText("Svenska");
    expect(langSelectorSv).to.equal(null);
  });

  it("Clicking lang selector in Footer changes language", async () => {
    setupReduxComponent(<Main />);

    let langSelectorSv = screen.getAllByText("Svenska");
    expect(langSelectorSv.length).to.equal(1);

    let langSelectorEn = screen.queryByText("English");
    expect(langSelectorEn).to.equal(null);

    fireEvent.click(langSelectorSv[0]);

    langSelectorEn = await waitFor(() => screen.getAllByText("English"));
    expect(langSelectorEn.length).to.equal(1);

    langSelectorSv = await waitFor(() => screen.queryByText("Svenska"));
    expect(langSelectorSv).to.equal(null);
  });

  it("Contains a Notifications area", function () {
    setupComponent(<Main />, { main: { loading: false } });

    const notificationsArea = screen.getAllByTestId(
      "edusign-notifications-area"
    );
    expect(notificationsArea.length).to.equal(1);
  });

  it("Notifications area displays notifications", function () {
    setupComponent(<Main />, {
      main: { loading: false },
      notifications: { notification: { level: "danger", message: "ho ho ho" } },
    });

    const notificationsArea = screen.getAllByText("ho ho ho");
    expect(notificationsArea.length).to.equal(1);
  });
});
