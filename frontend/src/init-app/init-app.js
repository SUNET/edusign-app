/*
 * This is meant to be imported in the entry points
 * to initialize the different components that the entry points
 * may want to render in different parts of the app.
 * Initialization involves localizing the app and providing
 * it with the redux store.
 */

import React from "react";
import ReactDOM from "react-dom";
import { configureStore } from "@reduxjs/toolkit";
import { Provider, updateIntl } from "react-intl-redux";
import rootReducer from "init-app/store";
import { appLoaded } from "slices/Main";

/* internationalization */

const langs = AVAILABLE_LANGUAGES;
const messages = LOCALIZED_MESSAGES;

/* to load persisted state from local storage */

const loadPersistedState = () => {
  try {
    const serializedState = localStorage.getItem("edusign-state");
    if (serializedState === null) {
      return undefined;
    }
    return {
      ...JSON.parse(serializedState),
      main: { loading: true },
      notifications: { notification: {} },
    };
  } catch (err) {
    return undefined;
  }
};

const saveState = (state) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem("edusign-state", serialized);
  } catch (err) {
    console.log("Cannot save the state: ", err);
  }
};

/* Redux store */

export const edusignStore = (test = false) => {
  let storeObj = { reducer: rootReducer };
  if (!test) {
    storeObj.preloadedState = loadPersistedState();
  }
  return configureStore(storeObj);
};

const store = edusignStore();

store.subscribe(() => {
  saveState(store.getState());
});

/* render app */

const appIsRendered = function () {
  window.setTimeout(() => store.dispatch(appLoaded()), 1000);
};

const init_app = function (target, component) {
  let language = navigator.languages
    ? navigator.languages[0]
    : navigator.language || navigator.userLanguage;

  language = language.split(/[-_]/)[0];

  const supported = langs.map((lang) => lang[0]);

  let lang = "en";

  if (supported.includes(language)) {
    lang = language;
  }
  const msgs = messages[lang];

  store.dispatch(
    updateIntl({
      locale: lang,
      messages: msgs,
    })
  );

  const wrappedComponent = <Provider store={store}>{component}</Provider>;

  ReactDOM.render(wrappedComponent, target, appIsRendered);
};

export default init_app;
