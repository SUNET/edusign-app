import React, { Component } from "react";
import PropTypes from "prop-types";

import HeaderContainer from "containers/Header";
import SplashContainer from "containers/Splash";
import FooterContainer from "containers/Footer";
import DnDAreaContainer from "containers/DnDArea";
import DocManagerContainer from "containers/DocManager";

import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "styles/reset.scss";
import "styles/Main.scss";

/**
 * @desc Main eduSign component.
 *
 * It displays a splash screen while the app is loading,
 * and combines te header and footer, the drag and drop area, and the document manager area.
 * @component
 */
class Main extends Component {
  render() {
    return (
      <>
        <SplashContainer />
        <section id="panel">
          <HeaderContainer />
          <div id="main-content">
            <DnDAreaContainer />
            <DocManagerContainer />
          </div>
          <FooterContainer />
        </section>
      </>
    );
  }
}

Main.propTypes = {};

export default Main;
