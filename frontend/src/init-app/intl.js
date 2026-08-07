/**
 * @module init-app/intl
 * @desc Local replacement for react-intl-redux, which is unmaintained and
 * caps react-intl at 6 and react-redux at 8.
 *
 * It keeps the same state shape, `state.intl.{locale,messages}`, and the
 * same `updateIntl({locale, messages})` action signature, and provides the
 * same `Provider` wrapping react-redux's Provider and react-intl's
 * IntlProvider fed from `state.intl`.
 */
import React from "react";
import { connect, Provider as ReduxProvider } from "react-redux";
import { IntlProvider, useIntl } from "react-intl";
import { createSlice } from "@reduxjs/toolkit";

/**
 * @public
 * @function injectIntl
 * @desc HOC giving class components the intl object as `props.intl`.
 * react-intl removed its injectIntl in version 7; this replacement keeps
 * the existing class components and the `this.props.intl` idiom working.
 */
export const injectIntl = (Component) => {
  const Wrapped = (props) => {
    const intl = useIntl();
    return <Component {...props} intl={intl} />;
  };
  Wrapped.displayName = `injectIntl(${
    Component.displayName || Component.name || "Component"
  })`;
  return Wrapped;
};

const intlSlice = createSlice({
  name: "intl",
  initialState: {
    locale: "en",
    messages: {},
  },
  reducers: {
    /**
     * @public
     * @function updateIntl
     * @desc Redux action to set the UI locale and its messages.
     */
    updateIntl(state, action) {
      state.locale = action.payload.locale;
      state.messages = action.payload.messages;
    },
  },
});

export const { updateIntl } = intlSlice.actions;
export const intlReducer = intlSlice.reducer;

/**
 * The key on IntlProvider remounts the subtree when the locale changes,
 * as react-intl-redux did.
 */
const KeyedIntlProvider = ({ locale, messages, children }) => (
  <IntlProvider key={locale} locale={locale} messages={messages}>
    {children}
  </IntlProvider>
);

const mapStateToProps = (state) => {
  return {
    locale: state.intl.locale,
    messages: state.intl.messages,
  };
};

const ConnectedIntlProvider = connect(mapStateToProps)(KeyedIntlProvider);

export const Provider = ({ store, children }) => (
  <ReduxProvider store={store}>
    <ConnectedIntlProvider>{children}</ConnectedIntlProvider>
  </ReduxProvider>
);
