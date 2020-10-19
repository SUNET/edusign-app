import React from "react";
import { screen, cleanup, waitFor } from "@testing-library/react";
import { expect } from "chai";

import {
  setupComponent,
  setupReduxComponent,
  mockFileData,
  dispatchEvtWithData,
  flushPromises,
} from "tests/test-utils";
import Main from "components/Main";
import DnDAreaContainer from "containers/DnDArea";

describe("DnDArea Component", function () {
  afterEach(cleanup);

  it("Shows dnd area ready to accept documents", function () {
    setupComponent(<DnDAreaContainer />, {});

    const dndArea = screen.getAllByText(
      "Documents to sign. Drag & drop or click to browse"
    );
    expect(dndArea.length).to.equal(1);

    const dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);
  });

  it("Shows dnd area ready to drop documents", function () {
    setupComponent(<DnDAreaContainer />, { dnd: { state: "receiving" } });

    const dndAreaDropping = screen.getAllByText("Drop documents here");
    expect(dndAreaDropping.length).to.equal(1);

    const dndArea = screen.queryByText(
      "Documents to sign. Drag & drop or click to browse"
    );
    expect(dndArea).to.equal(null);
  });

  it("It shows dnd area ready to drop documents on drag enter event ", async () => {
    const { wrapped, rerender } = setupReduxComponent(<DnDAreaContainer />);

    let dndArea = screen.getAllByText(
      "Documents to sign. Drag & drop or click to browse"
    );
    expect(dndArea.length).to.equal(1);

    let dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);

    const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

    const file = new File([JSON.stringify({ ping: true })], "ping.json", {
      type: "application/json",
    });
    const data = mockFileData([file]);

    dispatchEvtWithData(dnd, "dragenter", data);
    await flushPromises(rerender, wrapped);

    dndAreaDropping = await waitFor(() =>
      screen.getAllByText("Drop documents here")
    );
    expect(dndAreaDropping.length).to.equal(1);

    dndArea = await waitFor(() =>
      screen.queryByText("Documents to sign. Drag & drop or click to browse")
    );
    expect(dndArea).to.equal(null);
  });

  it("It shows the file name after a drop event ", async () => {
    const { wrapped, rerender } = setupReduxComponent(<Main />);

    let filename = screen.queryByText(/ping.json/i);
    expect(filename).to.equal(null);

    const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

    const file = new File([JSON.stringify({ ping: true })], "ping.json", {
      type: "application/json",
    });
    const data = mockFileData([file]);

    dispatchEvtWithData(dnd, "drop", data);
    await flushPromises(rerender, wrapped);

    filename = await waitFor(() => screen.getAllByText(/ping.json/i));
    expect(dndAreaDropping.length).to.equal(1);
  });
});
