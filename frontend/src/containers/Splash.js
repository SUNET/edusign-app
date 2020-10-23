/**
 * @module containers/Splash
 * @desc In this module we connect the Splash component with the Redux store.
 *
 * In mapStateToProps we take the state.main.loading key from the central store
 * and assign it to the is_app_loading prop of the component.
 */
import { connect } from "react-redux";
import Splash from "components/Splash";

const mapStateToProps = (state, props) => {
  return {
    is_app_loading: state.main.loading,
  };
};

export default connect(mapStateToProps)(Splash);
