import { connect } from "react-redux";

import Button from "components/Button";
import { setSpinning } from "slices/Button";

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
      await this.props.onClick();
      return true;
    },
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Button);

