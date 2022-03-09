import { connect } from "react-redux";

import OverlayTrigger from "components/Overlay";
import Tooltip from "components/Tooltip";
import Popover from "components/Popover";
import { enableContextualHelp } from "slices/Main";

const mapStateToProps = (state) => {
  return {
    showHelp: state.main.showHelp,
  };
};

export const ESTooltip = connect(mapStateToProps)(Tooltip);

export const ESPopover = connect(mapStateToProps)(Popover);

export default connect(mapStateToProps)(OverlayTrigger);
