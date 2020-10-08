import React from "react";
import { spy } from "sinon";
import { Provider } from "react-intl-redux";
import { render } from "@testing-library/react";
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
  const wrapper = render(<Provider store={store}>{component}</Provider>);
  return wrapper;
}
