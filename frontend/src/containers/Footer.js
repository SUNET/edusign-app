/**
 * @module containers/Footer
 * @desc In this module we connect the Footer component with the Redux store.
 *
 * In mapStateToProps we take the language key from the central store
 * and add it to the props of the component.
 *
 * in mapDispatchToProps we compose the handler to change the UI language making use
 * of the Redux dispatch function and the updateIntl action from react-intl-redux.
 */
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";
import Cookies from "js-cookie";

import Footer from "components/Footer";
import { enableContextualHelp } from "slices/Main";

const mapStateToProps = (state) => {
  return {
    language: state.intl.locale,
    showHelp: state.main.showHelp,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    changeLanguage: function (e) {
      const lang = e.target.value;
      Cookies.remove("lang");
      Cookies.set("lang", lang, {
        expires: 365,
        ameSite: "Strict",
        secure: true,
      });
      const msgs = LOCALIZED_MESSAGES[lang];
      dispatch(
        updateIntl({
          locale: lang,
          messages: msgs,
        }),
      );
    },
    handleHelpControl: function (e) {
      const showHelp = e.target.checked;
      Cookies.remove("showHelp");
      Cookies.set("showHelp", showHelp, {
        expires: 365,
        SameSite: "Strict",
        secure: true,
      });
      dispatch(enableContextualHelp(showHelp));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Footer);
