import { connect } from "react-redux";

import Button from "components/Button";
import { setSpinning, unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {
    spinning: state.button.spinning,
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
        promise.catch(dispatch(unsetSpinning()));
      }
    },
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Button);

