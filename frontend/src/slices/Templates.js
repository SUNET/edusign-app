/**
 * @module slices/Templates
 * @desc Here we keep document templates, in the templates key of the redux store,
 * and the actions and reducers to manipulate them.
 */
import { createSlice } from "@reduxjs/toolkit";

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
    setTemplates(docs) {
      state.documents = docs;
    },
    /**
     * @public
     * @function addTemplate
     * @desc Redux action to add a template to the store
     */
    addTemplate(doc) {
      state.documents.push(doc);
    },
    /**
     * @public
     * @function rmTemplate
     * @desc Redux action to remove a template from the store
     */
    rmTemplate(docid) {
      state.documents = state.documents.filter(doc => doc.id !== docid);
    },
  },
});

export const { setTemplates, addTemplate, rmTemplate } = templateSlice.actions;

export default templateSlice.reducer;
