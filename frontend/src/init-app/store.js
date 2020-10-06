import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import notifications from "slices/Notifications";
import main from "slices/Main";

export default combineReducers({
  main,
  notifications,
  intl: intlReducer,
});
