/**
 * @module containers/Footer
 * @desc In this module we connect the Footer component with the Redux store.
 *
 * in mapDispatchToProps we compose the handler to change the UI language making use
 * of the Redux dispatch function and the updateIntl action from react-intl-redux.
 */
import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import Footer from "components/Footer";

const mapStateToProps = (state, props) => {
  return {
    language: state.intl.locale,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    changeLanguage: function (e) {
      const lang = e.target.closest(".lang-selected").dataset.lang;
      const msgs = LOCALIZED_MESSAGES[lang];
      dispatch(
        updateIntl({
          locale: lang,
          messages: msgs,
        })
      );
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Footer);
