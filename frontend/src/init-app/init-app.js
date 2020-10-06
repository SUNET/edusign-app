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

/* Redux store */

const store = configureStore({
  reducer: rootReducer,
});

/* internationalization */

const langs = AVAILABLE_LANGUAGES;
const messages = LOCALIZED_MESSAGES;

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
