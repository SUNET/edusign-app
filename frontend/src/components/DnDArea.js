import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import { FormattedMessage } from "react-intl";

import "styles/DnDArea.scss";

class DnDArea extends Component {
  render() {
    return (
      <Dropzone onDrop={this.props.handleFileDrop}>
        {({ getRootProps, getInputProps }) => (
          <section>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <p>
                <FormattedMessage
                  defaultMessage="Drag & drop PDF or click to browse"
                  key="dnd-area"
                />
              </p>
            </div>
          </section>
        )}
      </Dropzone>
    );
  }
}

DnDArea.propTypes = {};

export default DnDArea;
