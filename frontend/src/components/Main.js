import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import FooterContainer from "containers/Footer";

import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "styles/Main.scss";


class Main extends Component {
  render() {
    return (
      <>
        <section id="panel">
          <span id="main-content">
            <FormattedMessage defaultMessage="Main Component" key="test" />
          </span>
          <FooterContainer />
        </section>
      </>
    );
  }
}

Main.propTypes = {};

export default Main;
