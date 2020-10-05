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
