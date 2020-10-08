import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import "styles/Footer.scss";

class Footer extends Component {
  render() {
    const langElems = AVAILABLE_LANGUAGES.map((lang, index) => {
      if (lang[0] === this.props.language) {
        // sets the < html lang=""> to the interface language
        document.documentElement.lang = this.props.language;
      } else {
        return (
          <p key="0" className="lang-selected" data-lang={lang[0]} key={index}>
            <a key="0" onClick={this.props.changeLanguage}>
              {lang[1]}
            </a>
          </p>
        );
      }
    });

    return (
      <footer key="0" id="footer" data-testid="edusign-footer">
        <p key="0" id="copyright">
          <span data-testid="edusign-copyright">
            &copy;&nbsp;
            <FormattedMessage defaultMessage="SUNET 2020" key="copyright" />
          </span>
        </p>
        <nav key="1">
          <ul>
            <li key="1" id="language-selector">
              {langElems}
            </li>
          </ul>
        </nav>
      </footer>
    );
  }
}

Footer.propTypes = {
  language: PropTypes.string,
  changeLanguage: PropTypes.func,
};

export default Footer;
