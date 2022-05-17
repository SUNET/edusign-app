import { connect } from "react-redux";

import ESDropdownItem from "components/DropdownItem";
import { setSpinning, unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {
    disable: state.button.spinning,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    doHandleClick: async function () {
      if (this.props.disabling) {
        dispatch(setSpinning(this.props.id));
      }
      const promise = this.props.onClick();
      if (promise !== undefined) {
        promise.finally((e) => dispatch(unsetSpinning()));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ESDropdownItem);
