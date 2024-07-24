/**
 * @module init-app/init-app
 * @desc Here we define the init_app function that initializes the app,
 * meant to be used in the webpack entry points.
 * <br />&nbsp;
 * Initialization involves localizing the app and providing
 * it with a redux store.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider, updateIntl } from "react-intl-redux";
import Cookies from "js-cookie";
import rootReducer from "init-app/store";
import { fetchConfig, resizeWindow, enableContextualHelp } from "slices/Main";

/*
 * internationalization.
 * These globals are provided by a custom webpack plugin.
 */

const langs = AVAILABLE_LANGUAGES;
const messages = LOCALIZED_MESSAGES;

/**
 * @public
 * @function edusignStore
 * @desc To build the Redux store, using configureStore from redux-toolkit.
 */
export const edusignStore = () => {
  let storeObj = { reducer: rootReducer };
  return configureStore(storeObj);
};

const store = edusignStore();

/* render app */

/**
 * @private
 * @function appIsRendered
 * @desc Callback to be executed when React.render has finished rendering the Main component.
 * <br />&nbsp;
 * It will trigger retrieving configuration parameters from the backend and loading documents from the IndeedBD db.
 */
export const appIsRendered = async function () {
  await store.dispatch(fetchConfig());
};

/**
 * @public
 * @function init_app
 * @param {Node} target: DOM Node to append the rendered component to.
 * @param {React.Component} component: React component to render.
 * @desc Initialize the app.
 * <br />&nbsp;
 * Work out the browser language and dispatch an updateIntl action (from react-intl-redux),
 * and render the provided component wrapped in a Redux Provider.
 */
const init_app = function (target, component) {
  let language = Cookies.get("lang");
  if (!language) {
    language = navigator.languages
      ? navigator.languages[0]
      : navigator.language || navigator.userLanguage;

    language = language.split(/[-_]/)[0];
  }

  const supported = langs.map((lang) => lang[0]);

  let lang = "en";

  if (supported.includes(language)) {
    lang = language;
  }
  Cookies.set("lang", lang);
  const msgs = messages[lang];

  store.dispatch(
    updateIntl({
      locale: lang,
      messages: msgs,
    }),
  );
  store.dispatch(resizeWindow());

  window.onresize = () => {
    store.dispatch(resizeWindow());
  };

  let showHelp = Cookies.get("showHelp");
  if (showHelp === undefined || showHelp === "true") showHelp = true;
  if (showHelp === "false") showHelp = false;
  store.dispatch(enableContextualHelp(showHelp));

  const wrappedComponent = <Provider store={store}>{component}</Provider>;

  const root = createRoot(target);

  root.render(wrappedComponent);
};

export default init_app;
