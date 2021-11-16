import { connect } from "react-redux";

import OverlayTrigger from "components/Overlay";
import * as overlay from "components/Overlay";
import { enableContextualHelp } from "slices/Main";

const mapStateToProps = (state) => {
  return {
    showHelp: state.main.showHelp,
  };
};

export const ESTooltip = connect(mapStateToProps)(overlay.ESTooltip);

export const ESPopover = connect(mapStateToProps)(overlay.ESPopover);

export default connect(mapStateToProps)(OverlayTrigger);
