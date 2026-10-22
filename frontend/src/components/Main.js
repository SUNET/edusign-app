import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { injectIntl } from "init-app/intl";
import Header from "components/Header";
import SplashContainer from "containers/Splash";
import Footer from "components/Footer";
import DnDArea from "components/DnDArea";
import DocManagerContainer from "containers/DocManager";
import PollContainer from "containers/Poll";
import UserInfoContainer from "containers/UserInfo";
import { appIsRendered } from "init-app/init-app";
import Notifications from "components/Notifications";
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
        <div id={panelId}>
          <Header />
          <Notifications />
          <main id="main-content">
            {!this.props.unauthn &&
              !this.props.using_freja &&
              !this.props.using_bankid && <DnDArea />}
            <p id="contact-local-it-msg" className="help-text">
              <FormattedMessage
                defaultMessage="If you experience problems with eduSign contact your local IT-support"
                key="contact-local-it-msg"
              />
            </p>
            <DocManagerContainer />
          </main>
          <Footer />
        </div>
        <PollContainer />
        <UserInfoContainer />
      </>
    );
  }
}

Main.propTypes = {
  size: PropTypes.string,
};

export default injectIntl(Main);
