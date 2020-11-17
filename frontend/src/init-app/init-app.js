/**
 * @module init-app/init-app
 * @desc Here we define the init_app function that initializes the app,
 * meant to be used in the webpack entry points.
 * <br />&nbsp;
 * Initialization involves localizing the app and providing
 * it with a redux store, possibly loaded from local storage.
 */

import React from "react";
import ReactDOM from "react-dom";
import { configureStore } from "@reduxjs/toolkit";
import { Provider, updateIntl } from "react-intl-redux";
import rootReducer from "init-app/store";
import { fetchConfig } from "slices/Main";

/*
 * internationalization.
 * These globals are provided by a custom webpack plugin.
 */

const langs = AVAILABLE_LANGUAGES;
const messages = LOCALIZED_MESSAGES;

/**
 * @private
 * @function loadPersistedState
 * @desc To load persisted Redux state from local storage
 */
const loadPersistedState = () => {
  try {
    const serializedState = localStorage.getItem("edusign-state");
    if (serializedState === null) {
      return undefined;
    }
    return {
      ...JSON.parse(serializedState),
      main: { loading: true },
      notifications: { messages: [] },
    };
  } catch (err) {
    return undefined;
  }
};

/**
 * @private
 * @function saveState
 * @param {object} state: The Redux state to be saved to local storage.
 * @desc To save the Redux state into local storage.
 */
const saveState = (state) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem("edusign-state", serialized);
  } catch (err) {
    console.log("Cannot save the state: ", err);
  }
};

/**
 * @public
 * @function edusignStore
 * @param {boolean} test: to indicate whether we are calling the function from test code.
 * @desc To build the Redux store, using configureStore from redux-toolkit.
 * <br />&nbsp;
 * It will load any Redux state saved in local storage
 * if we are not calling this function from test code.
 */
export const edusignStore = (test = false) => {
  let storeObj = { reducer: rootReducer };
  if (!test) {
    storeObj.preloadedState = loadPersistedState();
  }
  return configureStore(storeObj);
};

const store = edusignStore();

/* subscribe the saveState function to changes on the Redux store */
store.subscribe(() => {
  saveState(store.getState());
});

/* render app */

/**
 * @private
 * @function appIsRendered
 * @desc Callback to be executed when React.render has finished rendering the Main component.
 */
const appIsRendered = function () {
  store.dispatch(fetchConfig());
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
