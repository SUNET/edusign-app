import { combineReducers } from "redux";
import { intlReducer } from "init-app/intl";

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
import overlay from "slices/Overlay";
import pdfform from "slices/PDFForms";
import userinfo from "slices/UserInfo";
import fast_signature from "slices/FastSignature";
import al3warning from "slices/AL3Warning";

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
  overlay,
  pdfform,
  userinfo,
  fast_signature,
  al3warning,
  intl: intlReducer,
});
