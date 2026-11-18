/**
 * @desc Common layout for one document in the lists. What varies between
 * the document states is passed in as props: whether it is selectable
 * and removable, whether to show the size and the message, and which
 * buttons to offer.
 *
 * @component
 */
import React from "react";
import PropTypes from "prop-types";

import * as widgets from "components/widgets";

const DocumentRow = ({
  props,
  doc,
  selectable = false,
  size = true,
  message = false,
  buttons = null,
  removable = false,
}) => (
  <div className="select-column">
    {selectable ? widgets.selectDoc(props, doc) : widgets.dummySelectDoc()}
    {widgets.docName(doc)}
    {size && widgets.docSize(doc)}
    {message && widgets.showMessage(doc)}
    {buttons && <div className="buttons-flex">{buttons}</div>}
    {removable &&
      widgets.removeConfirmButton(props, doc, `confirm-remove-${doc.name}`)}
  </div>
);

DocumentRow.propTypes = {
  props: PropTypes.object,
  doc: PropTypes.object,
  selectable: PropTypes.bool,
  size: PropTypes.bool,
  message: PropTypes.bool,
  buttons: PropTypes.node,
  removable: PropTypes.bool,
};

export default DocumentRow;
