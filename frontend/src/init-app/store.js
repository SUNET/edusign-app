import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import main from "slices/Main";
import notifications from "slices/Notifications";
import documents from "slices/Documents";
import dnd from "slices/DnDArea";

export default combineReducers({
  main,
  notifications,
  documents,
  dnd,
  intl: intlReducer,
});
