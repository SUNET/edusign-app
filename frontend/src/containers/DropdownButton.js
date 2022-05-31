import { connect } from "react-redux";

import { DropdownButton } from "components/Button";
import { setSpinning, unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {
    spinning: state.button.spinning,
  };
};

export default connect(mapStateToProps)(DropdownButton);
