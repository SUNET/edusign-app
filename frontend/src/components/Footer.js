import React from "react";
import { FormattedMessage } from "react-intl";
import { injectIntl, updateIntl } from "init-app/intl";
import Form from "react-bootstrap/Form";
import Cookies from "js-cookie";
import { enableContextualHelp } from "slices/Main";
import "styles/Footer.scss";
import { useDispatch, useSelector } from "react-redux";

/**
 * @desc Footer, with the copyright and the language selector
 * @component
 */
function Footer(props) {
  const language = useSelector((state) => state.intl.locale);
  const showHelp = useSelector((state) => state.main.showHelp);
  const company_link = useSelector((state) => state.main.company_link);
  const dispatch = useDispatch();

  const langElements = AVAILABLE_LANGUAGES.map((lang) => {
    if (lang[0] === language) {
      document.documentElement.lang = language;
      return (
        <option value={lang[0]} key={lang[0]}>
          {lang[1]}
        </option>
      );
    } else {
      return (
        <option value={lang[0]} key={lang[0]}>
          {lang[1]}
        </option>
      );
    }
  });

  const changeLanguage = (e) => {
    const lang = e.target.value;
    Cookies.remove("lang");
    Cookies.set("lang", lang, {
      expires: 365,
      sameSite: "Strict",
      secure: true,
    });
    const msgs = LOCALIZED_MESSAGES[lang];
    dispatch(
      updateIntl({
        locale: lang,
        messages: msgs,
      }),
    );
  };

  const handleHelpControl = (e) => {
    const showHelp = e.target.checked;
    Cookies.remove("showHelp");
    Cookies.set("showHelp", showHelp, {
      expires: 365,
      SameSite: "Strict",
      secure: true,
    });
    dispatch(enableContextualHelp(showHelp));
  };

  return (
    <footer key="0" id="footer" data-testid="edusign-footer">
      <a href={company_link}>
        <div id="sunet-logo" data-testid="sunet-logo">
          <img src="/assets/company-logo.png" alt="SUNET" />
        </div>
      </a>
      <div id="help-control">
        <label className="help-control-container">
          <FormattedMessage
            defaultMessage="Show contextual help"
            key="show-help"
          />
          <input
            type="checkbox"
            onChange={handleHelpControl}
            checked={showHelp}
          />
          <span className="help-control-checkmark"></span>
        </label>
      </div>
      <nav key="1">
        <Form.Select
          onChange={changeLanguage}
          value={language}
          data-testid="language-selector"
          aria-label={props.intl.formatMessage({
            defaultMessage: "Select language",
            id: "footer-language-selector",
          })}
        >
          {langElements}
        </Form.Select>
      </nav>
    </footer>
  );
}

export default injectIntl(Footer);
