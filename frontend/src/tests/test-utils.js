import React from "react";
import { spy } from "sinon";
import { Provider } from "react-intl-redux";
import { act, render, fireEvent, waitFor } from "@testing-library/react";
import configureStore from "redux-mock-store";
import { store } from "init-app/init-app";

const messages = {
  en: require("../../translations/en.json"),
  sv: require("../../translations/sv.json"),
};

const middlewares = [];
const mockStore = configureStore(middlewares);

const initialState = {
  main: {
    loading: true,
  },
  notifications: {
    notification: {},
  },
  intl: {
    locale: "en",
    messages: messages,
  },
  dnd: {
    state: "waiting",
  },
  documents: {
    documents: [],
  },
};

export function setupComponent(component, stateOverrides) {
  const state = {
    ...initialState,
    ...stateOverrides,
  };
  if (state.intl.locale === "sv") {
    state.intl.messages = messages.sv;
  }
  const fakeStore = mockStore(state);
  const wrapper = render(<Provider store={fakeStore}>{component}</Provider>);
  return wrapper;
}

export function setupReduxComponent(component) {
  const wrapped = <Provider store={store}>{component}</Provider>;
  const { container, rerender } = render(wrapped);
  return { wrapped, rerender };
}

export function mockFileData(files) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    },
  };
}

export async function flushPromises(rerender, ui) {
  await act(() => waitFor(() => rerender(ui)));
}

export function dispatchEvtWithData(node, type, data) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, data);
  fireEvent(node, event);
}
