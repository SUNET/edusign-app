/**
 * @module slices/Templates
 * @desc Here we keep document templates, in the templates key of the redux store,
 * and the actions and reducers to manipulate them.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dbRemoveDocument } from "init-app/database";

/**
 * @public
 * @function removeTemplate
 * @desc Redux async thunk to remove a template
 */
export const removeTemplate = createAsyncThunk(
  "template/removeTemplate",
  async (args, thunkAPI) => {
    const state = thunkAPI.getState();
    const doc = state.template.documents.filter((d) => {
      return d.id === args.docid;
    })[0];
    if (doc.id !== undefined) {
      await dbRemoveDocument(doc);
    }
    return doc;
  }
);

const templateSlice = createSlice({
  name: "template",
  initialState: {
    documents: [],
  },
  reducers: {
    /**
     * @public
     * @function setTemplates
     * @desc Redux action to add templates to the store.
     */
    setTemplates(state, action) {
      state.documents = action.payload;
    },
    /**
     * @public
     * @function addTemplate
     * @desc Redux action to add a template to the store
     */
    addTemplate(state, action) {
      state.documents.push(action.payload);
    },
    /**
     * @public
     * @function rmTemplate
     * @desc Redux action to remove a template from the store
     */
    rmTemplate(state, action) {
      state.documents = state.documents.filter(doc => doc.id !== action.payload);
    },
    /**
     * @public
     * @function showTemplatePreview
     * @desc Redux action to update a document template in the documents state key,
     * setting the show key to true (so that the UI will show a preview of the document).
     */
    showTemplatePreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.key === action.payload) {
          return {
            ...doc,
            show: true,
          };
        } else return doc;
      });
    },
    /**
     * @public
     * @function hideTemplatePreview
     * @desc Redux action to update a document template in the documents state key,
     * setting the show key to false (so that the UI will hide the preview of the document).
     */
    hideTemplatePreview(state, action) {
      state.documents = state.documents.map((doc) => {
        if (doc.name === action.payload) {
          return {
            ...doc,
            show: false,
          };
        } else return doc;
      });
    },
  },
  extraReducers: {
    [removeTemplate.fulfilled]: (state, action) => {
      state.documents = state.documents.filter((doc) => {
        return doc.id !== action.payload.id;
      });
    },
  },
});

export const { setTemplates, addTemplate, rmTemplate, showTemplatePreview, hideTemplatePreview } = templateSlice.actions;

export default templateSlice.reducer;
