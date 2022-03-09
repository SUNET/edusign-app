import { combineReducers } from "redux";
import { intlReducer } from "react-intl-redux";

import main from "slices/Main";
import notifications from "slices/Notifications";
import documents from "slices/Documents";
import dnd from "slices/DnDArea";
import confirm from "slices/ConfirmDialog";
import modals from "slices/Modals";
import button from "slices/Button";
import poll from "slices/Poll";
import inviteform from "slices/InviteForm";
import template from "slices/Templates";

/**
 * @public
 * @object store
 * @desc Central redux store.
 */
export default combineReducers({
  main,
  notifications,
  documents,
  template,
  dnd,
  confirm,
  modals,
  button,
  poll,
  inviteform,
  intl: intlReducer,
});
