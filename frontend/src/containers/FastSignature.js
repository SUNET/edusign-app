import { connect } from "react-redux";

import FastSignature from "components/FastSignature";
import { unsetSpinning } from "slices/Button";
import { enablePolling } from "slices/Poll";
import { disableFastSignature } from "slices/FastSignature";
import { unsetActiveId } from "slices/Overlay";
import { startSigningDoc } from "slices/Documents";

const mapStateToProps = (state) => {
  return {
    show: state.fast_signature.show,
  };
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    handleClose: () => {
      dispatch(disableFastSignature());
      dispatch(unsetSpinning());
      dispatch(enablePolling());
      dispatch(unsetActiveId());
    },
    handleSign: () => {
      dispatch(disableFastSignature());
      dispatch(startSigningDoc({ doc: props.doc, intl: props.intl }));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FastSignature);

