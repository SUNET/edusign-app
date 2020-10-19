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

import DnDAreaContainer from "containers/DnDArea";

describe("DnDArea Component", function () {
  afterEach(cleanup);

  it("Shows dnd area ready to accept documents", function () {
    setupComponent(<DnDAreaContainer />, {});

    const dndArea = screen.getAllByText("Documents to sign. Drag & drop or click to browse");
    expect(dndArea.length).to.equal(1);

    const dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);
  });

  it("Shows dnd area ready to drop documents", function () {
    setupComponent(<DnDAreaContainer />, { dnd: { state: "receiving" } });

    const dndAreaDropping = screen.getAllByText("Drop documents here");
    expect(dndAreaDropping.length).to.equal(1);

    const dndArea = screen.queryByText("Documents to sign. Drag & drop or click to browse");
    expect(dndArea).to.equal(null);
  });

  it("It shows dnd area ready to drop documents on drag enter event ", async () => {

    const {wrapped, rerender} = setupReduxComponent(<DnDAreaContainer />);

    let dndArea = screen.getAllByText("Documents to sign. Drag & drop or click to browse");
    expect(dndArea.length).to.equal(1);

    let dndAreaDropping = screen.queryByText("Drop documents here");
    expect(dndAreaDropping).to.equal(null);

    const dnd = screen.getAllByTestId("edusign-dnd-area")[0];

    const file = new File([
      JSON.stringify({ping: true})
    ], 'ping.json', { type: 'application/json' })
    const data = mockData([file])

    dispatchEvt(dnd, "dragenter", data);
    await flushPromises(rerender, wrapped);

    dndAreaDropping = await waitFor(() => screen.getAllByText("Drop documents here"));
    expect(dndAreaDropping.length).to.equal(1);

    dndArea = await waitFor(() => screen.queryByText("Documents to sign. Drag & drop or click to browse"));
    expect(dndArea).to.equal(null);
  });
});

function mockData(files) {
  return {
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file
      })),
      types: ['Files']
    }
  }
}

async function flushPromises(rerender, ui) {
  await act(() => waitFor(() => rerender(ui)))
}

function dispatchEvt(node, type, data) {
  const event = new Event(type, { bubbles: true })
  Object.assign(event, data)
  fireEvent(node, event)
}
