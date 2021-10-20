import { connect } from "react-redux";

import OverlayTrigger from "components/Overlay";
import { enableContextualHelp } from "slices/Main";

const mapStateToProps = (state) => {
  return {
    showHelp: state.main.showHelp,
  };
};

export default connect(mapStateToProps)(OverlayTrigger);
