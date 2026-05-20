import { connect } from "react-redux";
import AL3Warning from "components/AL3Warning";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { hideAL3Warning } from "slices/AL3Warning";
const mapStateToProps = (state) => {
  return {
    show: state.al3warning.show,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    handleClose: () => {
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(hideAL3Warning());
    },
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(AL3Warning);
