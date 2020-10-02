import React from "react";

import { render, screen } from "@testing-library/react";

import Main from "components/Main";

import { expect } from "chai";

it("Main Component mounts", async () => {
  render(<Main />);

  const span = screen.getAllByText("Main Component");

  expect(span.length).to.equal(1);
});
