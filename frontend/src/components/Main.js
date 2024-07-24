import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, injectIntl } from "react-intl";

import HeaderContainer from "containers/Header";
import SplashContainer from "containers/Splash";
import FooterContainer from "containers/Footer";
import DnDAreaContainer from "containers/DnDArea";
import DocManagerContainer from "containers/DocManager";
import PollContainer from "containers/Poll";
import { appIsRendered } from "init-app/init-app";

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
  async componentDidMount() {
    await appIsRendered();
  }

  render() {
    const panelId = "panel-" + this.props.size;
    return (
      <>
        <SplashContainer />
        <section id={panelId}>
          <HeaderContainer />
          <div id="main-content">
            {!this.props.unauthn && <DnDAreaContainer />}
            <div id="contact-local-it-msg">
              <FormattedMessage
                defaultMessage="If you experience problems with eduSign contact your local IT-support"
                key="contact-local-it-msg"
              />
            </div>
            <DocManagerContainer />
          </div>
          <FooterContainer />
        </section>
        <PollContainer />
      </>
    );
  }
}

Main.propTypes = {
  size: PropTypes.string,
};

export default injectIntl(Main);
