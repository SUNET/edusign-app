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
        return (
          <option value={lang[0]} key={index}>
            {lang[1]}
          </option>
        );
      } else {
        return (
          <option value={lang[0]} key={index}>
            {lang[1]}
          </option>
        );
      }
    });

    return (
      <footer key="0" id="footer" data-testid="edusign-footer">
        <div id="help-control">
          <label className="help-control-container">
            {
              <FormattedMessage
                defaultMessage="Show contextual help"
                key="show-help"
              />
            }
            <input
              type="checkbox"
              onChange={this.props.handleHelpControl}
              checked={this.props.showHelp}
            />
            <span className="help-control-checkmark"></span>
          </label>
        </div>
        <nav key="1">
          <Form.Select
            onChange={this.props.changeLanguage}
            value={this.props.language}
            data-testid="language-selector"
          >
            {langElems}
          </Form.Select>
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
