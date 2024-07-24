import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import { FormattedMessage, injectIntl } from "react-intl";

import LittleSpinner from "components/LittleSpinner";
import "styles/DnDArea.scss";

/**
 * @component
 * @desc Drag and drop area for documents to sign.
 * <br />
 * I has 2 states, the initial "waiting" state,
 * and the "receiving" state triggered by a dragEnter event.
 */
class DnDArea extends Component {
  render() {
    return (
      <>
      {this.props.configured && (
        <Dropzone
          accept={{ "application/pdf": [".pdf"], "application/xml": [".xml"] }}
          onDrop={this.props.handleFileDrop(this.props.intl)}
          onDragEnter={this.props.handleDragEnter}
          onDragLeave={this.props.handleDragLeave}
          onDropRejected={this.props.handleRejected(this.props.intl)}
          useFsAccessApi={this.props.useFsAccessApi}
        >
          {({ getRootProps, getInputProps }) => {
            if (this.props.status === "waiting") {
              return (
                <section id={"edusign-dnd-wrapper-" + this.props.size}>
                  <div
                    {...getRootProps({
                      id: "edusign-dnd-area",
                      "data-testid": "edusign-dnd-area",
                    })}
                  >
                    <input {...getInputProps({
                      id: "edusign-dnd-input",
                      "data-testid": "edusign-dnd-input",
                    })} />
                    <div id="dnd-arrow-up" />
                    {this.props.size === "lg" ? (
                      <div id="dnd-message-head-lg">
                        <div id="dnd-area-head-1">
                          <FormattedMessage
                            defaultMessage="Drag and drop files to be signed here"
                            key="dnd-area-head-1"
                          />
                        </div>
                        <div id="dnd-area-head-2">
                          <FormattedMessage
                            defaultMessage="or"
                            key="dnd-area-head-2"
                          />
                        </div>
                        <div id="dnd-area-head-3">
                          <FormattedMessage
                            defaultMessage="click here to choose files to be signed"
                            key="dnd-area-head-3"
                          />
                        </div>
                      </div>
                    ) : (
                      <div id="dnd-area-head-1">
                        <FormattedMessage
                          defaultMessage="Tap here to choose files to be signed"
                          key="dnd-area-head-sm"
                        />
                      </div>
                    )}
                  </div>
                </section>
              );
            } else if (this.props.status === "receiving") {
              return (
                <section id={"edusign-dnd-wrapper-" + this.props.size}>
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
            } else if (this.props.status === "loading") {
              return (
                <section id={"edusign-dnd-wrapper-" + this.props.size}>
                  <div
                    {...getRootProps({
                      id: "edusign-dnd-area-receiving",
                    })}
                  >
                    <input {...getInputProps()} />
                    <span id="dnd-message-dropping">
                      <LittleSpinner index="0" />
                    </span>
                  </div>
                </section>
              );
            }
          }}
        </Dropzone>
      ) || (
        <section id={"edusign-dnd-wrapper-" + this.props.size}>
          <div id="edusign-dnd-area">
            <span id="dnd-message-dropping">
              <FormattedMessage
                defaultMessage="Drop documents here"
                key="dnd-area-dropping"
              />
            </span>
          </div>
        </section>
      )}
      </>
    );
  }
}

DnDArea.propTypes = {
  /**
   * "waiting" or "receiving"
   */
  status: PropTypes.string,
  handleFileDrop: PropTypes.func,
  handleDragEnter: PropTypes.func,
  handleDragLeave: PropTypes.func,
  useFsAccessApi: PropTypes.bool,
  configured: PropTypes.bool,
};

export default injectIntl(DnDArea);
