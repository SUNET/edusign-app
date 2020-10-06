import React from "react";
import { screen } from "@testing-library/react";
import { setupComponent } from "tests/test-utils";
import { expect } from "chai";

import Main from "components/Main";


it("Main Component mounts", async () => {

  setupComponent(<Main />);

  const span = screen.getAllByText("Main Component");

  expect(span.length).to.equal(1);
});
