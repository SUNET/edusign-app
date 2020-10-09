import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";

import "styles/DocPreview.scss";

class DocPreview extends Component {
  render() {
    return (
      <>
        {this.props.documents.map((doc) => {
          return (
            <p>
              <span>{doc.name}</span>
              <span>{doc.size}</span>
              <span>{doc.type}</span>
            </p>
          );
        })}
      </>
    );
  }
}

DocPreview.propTypes = {};

export default DocPreview;
