import React, { Component } from "react";
import PropTypes from "prop-types";

import Header from "components/Header";
import SplashContainer from "containers/Splash";
import FooterContainer from "containers/Footer";
import DocumentForm from "components/DocumentForm";
import DocPreviewContainer from "containers/DocPreview";

import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "styles/reset.scss";
import "styles/Main.scss";

class Main extends Component {
  render() {
    return (
      <>
        <SplashContainer />
        <section id="panel">
          <Header />
          <span id="main-content">
            <DocumentForm />
          </span>
          <DocPreviewContainer />
          <FooterContainer />
        </section>
      </>
    );
  }
}

Main.propTypes = {};

export default Main;
