import React from "react";
import { spy } from "sinon";
import { Provider } from "react-intl-redux";
import { render } from "@testing-library/react";

const messages = require("../../translations/en.json");

const initialState = {
  main: {
    loading: true
  },
  notifications: {
    notification: {}
  },
  intl: {
    locale: 'en',
    messages: messages
  }
};

const fakeStore = state => ({
  default: () => {},
  dispatch: spy(),
  subscribe: spy(),
  getState: () => ({ ...state })
});

export function setupComponent(component, stateOverrides) {
  const state = {
    ...initialState,
    ...stateOverrides
  };
  const store = fakeStore(state);
  const wrapper = render(
    <Provider store={store}>
      {component}
    </Provider>
  );
  return wrapper;
}
