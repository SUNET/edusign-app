/**
 * @module slices/Modals
 * @desc Here we define the initial state for the Modals key of the Redux state,
 * and the actions and reducers to manipulate it.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { addNotification } from "slices/Notifications";
import {
  postRequest,
  checkStatus,
  extractCsrfToken,
  esFetch,
  preparePayload,
} from "slices/fetch-utils";

/**
 * @public
 * @function showEditInvitationForm
 * @desc Redux async thunk to open the form to edit an invitation to sign.
 *       We need to lock the document in the backend so that no invitee
 *       can sign while it is being edited.
 */
export const showEditInvitationForm = createAsyncThunk(
  "main/showEditInvitationForm",
  async (args, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const toSend = {
        key: args.key,
      };
      const body = preparePayload(state, toSend);
      const response = await esFetch("/sign/lock-doc", {
        ...postRequest,
        body: body,
      });
      const lockData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, lockData);
      if (lockData.error) {
        thunkAPI.dispatch(
          addNotification({
            level: "danger",
            message: lockData.message,
          }),
        );
        return thunkAPI.rejectWithValue(
          `Problem opening edit form: ${lockData.message}`,
        );
      } else {
        thunkAPI.dispatch(modalsSlice.actions.showForm(args.form_id));
      }
    } catch (err) {
      thunkAPI.dispatch(
        addNotification({
          level: "danger",
          message: args.intl.formatMessage({
            defaultMessage: "Problem opening edit form, please try again later",
            id: "problem-opening-edit-form",
          }),
        }),
      );
      return thunkAPI.rejectWithValue(`Problem opening edit form: ${err}`);
    }
  },
);

export const hideEditInvitationForm = createAsyncThunk(
  "main/hideEditInvitationForm",
  async (args, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const form_id = state.modals.form_id;
      const key = form_id.split("-edit-invitations")[0];
      const toSend = {
        key: key,
      };
      const body = preparePayload(state, toSend);
      const response = await esFetch("/sign/unlock-doc", {
        ...postRequest,
        body: body,
      });
      const lockData = await checkStatus(response);
      extractCsrfToken(thunkAPI.dispatch, lockData);
      thunkAPI.dispatch(modalsSlice.actions.hideForm());
    } catch (err) {
      thunkAPI.dispatch(modalsSlice.actions.hideForm());
    }
  },
);

const modalsSlice = createSlice({
  name: "modals",
  initialState: {
    show_form: false,
    form_id: null,
    show_resend: false,
    resend_id: null,
    show_preview: false,
    preview_id: null,
  },
  reducers: {
    /**
     * @public
     * @function showForm
     * @desc Redux action to trigger opening an invite form modal
     */
    showForm(state, action) {
      state.show_form = true;
      state.form_id = action.payload;
    },
    /**
     * @public
     * @function hideForm
     * @desc Redux action to trigger hiding an invite form modal
     */
    hideForm(state) {
      state.show_form = false;
      state.form_id = null;
    },
    /**
     * @public
     * @function showResend
     * @desc Redux action to trigger opening an re-invite form modal
     */
    showResend(state, action) {
      state.show_resend = true;
      state.resend_id = action.payload.key;
    },
    /**
     * @public
     * @function hideResend
     * @desc Redux action to trigger hiding an re-invite form modal
     */
    hideResend(state) {
      state.show_resend = false;
      state.resend_id = null;
    },
    /**
     * @public
     * @function showPreview
     * @desc Redux action to trigger opening a document preview modal
     */
    showPreview(state, action) {
      state.show_preview = true;
      state.preview_id = action.payload;
    },
    /**
     * @public
     * @function hidePreview
     * @desc Redux action to trigger hiding a document preview modal
     */
    hidePreview(state) {
      state.show_preview = false;
      state.preview_id = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(showEditInvitationForm.rejected, (state, action) => {
      console.log(action.payload);
    });
  },
});

export const {
  showForm,
  hideForm,
  showResend,
  hideResend,
  showPreview,
  hidePreview,
} = modalsSlice.actions;

export default modalsSlice.reducer;
