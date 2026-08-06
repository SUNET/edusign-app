import { connect } from "react-redux";

import ESDropdownItem from "components/DropdownItem";
import { setSpinning, unsetSpinning } from "slices/Button";

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch, props) => {
  return {
    doHandleClick: async function () {
      const promise = this.props.onClick();
      // Only spin for handlers that return a promise: a synchronous
      // handler (e.g. opening a modal) offers no later moment to
      // unset the spinner.
      if (promise !== undefined) {
        if (this.props.disabling) {
          // The id of the dropdown button this item belongs to,
          // as composed in components/Dropdown.js.
          dispatch(
            setSpinning(
              "dropdown-" + (this.props.doc.key || this.props.doc.name),
            ),
          );
        }
        promise.finally((e) => dispatch(unsetSpinning()));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ESDropdownItem);
