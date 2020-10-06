import { connect } from "react-redux";
import Splash from "components/Splash";

const mapStateToProps = (state, props) => {
  return {
    is_app_loading: state.main.loading,
  };
};

export default connect(mapStateToProps)(Splash);
