import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import main from "slices/Main";
import notifications from "slices/Notifications";
import documents from "slices/Documents";

export default combineReducers({
  main,
  notifications,
  documents,
  intl: intlReducer,
});
