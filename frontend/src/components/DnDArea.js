import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import { FormattedMessage } from "react-intl";

import "styles/DnDArea.scss";

class DnDArea extends Component {
  render() {
    return (
      <Dropzone
        onDrop={this.props.handleFileDrop}
        onDragEnter={this.props.handleDragEnter}
        onDragLeave={this.props.handleDragLeave}
      >
        {({ getRootProps, getInputProps }) => {
          if (this.props.status === "waiting") {
            return (
              <section id="edusign-dnd-wrapper">
                <div
                  {...getRootProps({
                    id: "edusign-dnd-area",
                    "data-testid": "edusign-dnd-area",
                  })}
                >
                  <input {...getInputProps()} />
                  <span id="dnd-message">
                    <FormattedMessage
                      defaultMessage="Documents to sign. Drag & drop or click to browse"
                      key="dnd-area"
                    />
                  </span>
                </div>
              </section>
            );
          } else if (this.props.status === "receiving") {
            return (
              <section id="edusign-dnd-wrapper">
                <div
                  {...getRootProps({
                    id: "edusign-dnd-area-receiving",
                  })}
                >
                  <input {...getInputProps()} />
                  <span id="dnd-message-dropping">
                    <FormattedMessage
                      defaultMessage="Drop documents here"
                      key="dnd-area-dropping"
                    />
                  </span>
                </div>
              </section>
            );
          }
        }}
      </Dropzone>
    );
  }
}

DnDArea.propTypes = {
  status: PropTypes.string,
  handleFileDrop: PropTypes.func,
  handleDragEnter: PropTypes.func,
  handleDragLeave: PropTypes.func,
};

export default DnDArea;
