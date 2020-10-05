import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import notifications from "slices/Notifications";

export default combineReducers({
  intl: intlReducer,
  notifications,
});
