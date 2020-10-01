/*
 * This is meant to be imported in the entry points
 * to initialize the different components that the entry points
 * may want to render in different parts of the app.
 * Initialization involves localizing the app and providing
 * it with the redux store.
 */

import React from "react";
import ReactDOM from "react-dom";
import { IntlProvider } from 'react-intl';
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import rootReducer from "init-app/store";


/* Redux store */

const store = configureStore({
  reducer: rootReducer,
});

/* internationalization */

const langs = [
  ["en", "English"],
  ["sv", "Svenska"]
];

import en from "translations/en.json";
import sv from "translations/sv.json";

const messages = {
  en: en,
  sv: sv,
};

/* render app */

const init_app = function(target, component) {

  let language = navigator.languages
    ? navigator.languages[0]
    : navigator.language || navigator.userLanguage;

  language = language.split(/[-_]/)[0];

  const supported = langs.map(lang => lang[0]);

  let lang = 'en';

  if (supported.includes(language)) {
    lang = language;
  }

  const wrappedComponent = (
    <Provider store={store}>
      <IntlProvider messages={messages[lang]} locale={lang} defaultLocale="en">
        {component}
      </IntlProvider>
    </Provider>
  );

  ReactDOM.render(wrappedComponent, target);
};

export default init_app;
