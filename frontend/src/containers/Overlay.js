import { connect } from "react-redux";

import Tooltip from "components/Tooltip";
import Popover from "components/Popover";
import { setActiveId, unsetActiveId } from "slices/Overlay";

const mapStateToProps = (state, props) => {
  let showHelp = state.main.showHelp ? undefined : false;
  if (showHelp === undefined) {
    const active = state.overlay.active;
    if (active !== "") {
      if (props.helpId === active) {
        showHelp = true;
      } else {
        showHelp = false;
      }
    }
  }
  return {
    showHelp: showHelp,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleToggleOverlay: (helpId) => {
      return (val) => {
        if (val) {
          dispatch(setActiveId(helpId));
        } else {
          dispatch(unsetActiveId(helpId));
        }
      };
    },
  };
};

export const ESTooltip = connect(mapStateToProps, mapDispatchToProps)(Tooltip);

export const ESPopover = connect(mapStateToProps, mapDispatchToProps)(Popover);
