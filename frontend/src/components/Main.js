import React, { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import Header from "components/Header";
import SplashContainer from "containers/Splash";
import Footer from "components/Footer";
import DnDArea from "components/DnDArea";
import DocManagerContainer from "containers/DocManager";
import PollContainer from "containers/Poll";
import UserInfo from "components/UserInfo";
import { appIsRendered } from "init-app/init-app";
import Notifications from "components/Notifications";
import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "styles/reset.scss";
import "styles/Main.scss";
import { useAppSelector } from "init-app/hooks";

/**
 * @desc Main eduSign component.
 *
 * It displays a splash screen while the app is loading,
 * and combines te header and footer, the drag and drop area, and the document manager area.
 * @component
 */
function Main() {
  const unauthn = useAppSelector((state) => state.main.unauthn);
  const size = useAppSelector((state) => state.main.size);
  const using_bankid = useAppSelector(
    (state) => !!state.main.signer_attributes?.using_bankid,
  );
  const using_freja = useAppSelector(
    (state) => !!state.main.signer_attributes?.using_freja,
  );

  useEffect(() => {
    void appIsRendered();
  }, []);

  const panelId = "panel-" + size;
  return (
    <>
      <SplashContainer />
      <div id={panelId}>
        <Header />
        <Notifications />
        <main id="main-content">
          {!unauthn && !using_freja && !using_bankid && (
            <>
              <DnDArea />
              <p id="contact-local-it-msg" className="help-text">
                <FormattedMessage
                  defaultMessage="If you experience problems with eduSign contact your local IT-support"
                  key="contact-local-it-msg"
                />
              </p>
            </>
          )}
          <DocManagerContainer />
        </main>
        <Footer />
      </div>
      <PollContainer />
      <UserInfo />
    </>
  );
}

export default Main;
