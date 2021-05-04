import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import main from "slices/Main";
import notifications from "slices/Notifications";
import documents from "slices/Documents";
import dnd from "slices/DnDArea";
import confirm from "slices/ConfirmDialog";
import modals from "slices/Modals";

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
  confirm,
  modals,
  intl: intlReducer,
});
