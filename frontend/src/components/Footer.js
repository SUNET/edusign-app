import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Form from "react-bootstrap/Form";

import "styles/Footer.scss";

/**
 * @desc Footer, with the copyright and the language selector
 * @component
 */
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
        <div key="0" id="help-control">
          <span data-testid="help-control">
            <Form.Check
              inline
              type="checkbox"
              checked={this.props.showHelp}
              label={(<FormattedMessage defaultMessage="Show contextual help" key="show-help" />)}
              onChange={this.props.handleHelpControl}
            />
          </span>
        </div>
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
  /**
   * The language to localize the app to.
   */
  language: PropTypes.string,
  changeLanguage: PropTypes.func,
  showHelp: PropTypes.bool,
};

export default Footer;
