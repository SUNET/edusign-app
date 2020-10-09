import React from "react";
import { FormattedMessage } from "react-intl";

import DnDAreaContainer from "containers/DnDArea";

const DocumentForm = () => (
  <div>
    <h1>
      <FormattedMessage defaultMessage="Enter Document" key="heading" />
    </h1>
    <DnDAreaContainer />
  </div>
);

export default DocumentForm;
