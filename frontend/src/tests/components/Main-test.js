import React from "react";
import { screen } from "@testing-library/react";
import { setupComponent } from "tests/test-utils";
import { expect } from "chai";

import Main from "components/Main";


it("Main Component shows splash screen", async () => {

  setupComponent(<Main />, {});

  const splashArray = screen.getAllByTestId("edusign-splash-screen");
  expect(splashArray.length).to.equal(1);
});


it("Main Component doesn't show splash screen", async () => {

  setupComponent(<Main />, {main: {loading: false}});

  const splash = screen.queryByTestId("edusign-splash-screen");
  expect(splash).to.equal(null);
});


it("Main Component displays Header", async () => {

  setupComponent(<Main />, {main: {loading: false}});

  const header = screen.getAllByTestId("edusign-banner");
  expect(header.length).to.equal(1);

  const eduSignLogo = screen.getAllByTestId("edusign-logo");
  expect(eduSignLogo.length).to.equal(1);

  const sunetLogo = screen.getAllByTestId("sunet-logo");
  expect(sunetLogo.length).to.equal(1);

  const tagline = screen.getAllByText("Welcome to eduSign");
  expect(tagline.length).to.equal(1);
});


it("Main Component displays Footer", async () => {

  setupComponent(<Main />, {main: {loading: false}});

  const footer = screen.getAllByTestId("edusign-footer");
  expect(footer.length).to.equal(1);

  const copyright = screen.getAllByText("SUNET 2020", {exact: false});
  expect(copyright.length).to.equal(1);

  const langSelectorSv = screen.getAllByText("Svenska");
  expect(langSelectorSv.length).to.equal(1);
});


it("Main Component displays Footer", async () => {

  setupComponent(<Main />, {main: {loading: false}, intl: {locale: "sv"}});

  const langSelectorEn = screen.getAllByText("English");
  expect(langSelectorEn.length).to.equal(1);
});
