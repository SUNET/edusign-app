import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import main from "slices/Main";
import notifications from "slices/Notifications";
import documents from "slices/Documents";
import dnd from "slices/DnDArea";
import invites from "slices/Invite";

/**
 * @public
 * @object store
 * @desc Central redux store.
 */
export default combineReducers({
  main,
  notifications,
  documents,
  dnd,
  invites,
  intl: intlReducer,
});
