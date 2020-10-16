import React, { Component } from "react";
import PropTypes from "prop-types";

import Header from "components/Header";
import SplashContainer from "containers/Splash";
import FooterContainer from "containers/Footer";
import DnDAreaContainer from "containers/DnDArea";
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
          <div id="main-content">
            <DnDAreaContainer />
            <DocPreviewContainer />
          </div>
          <FooterContainer />
        </section>
      </>
    );
  }
}

Main.propTypes = {};

export default Main;
