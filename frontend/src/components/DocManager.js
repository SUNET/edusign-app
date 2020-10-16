import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import Button from "react-bootstrap/Button";
import LittleSpinner from "components/LittleSpinner";

import DocPreviewContainer from "containers/DocPreview";
import { humanFileSize } from "utils";

import "styles/DocManager.scss";

function DocManager(props) {
  function commonButtons(index) {
    return (
      <>
        <div className="button-preview-flex-item">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={props.handlePreview(index)}
          >
            <FormattedMessage defaultMessage="Preview" key="preview-button" />
          </Button>
        </div>
        <div className="button-download-flex-item">
          <Button
            as="a"
            variant="outline-secondary"
            size="sm"
            id={"download-link-" + index}
          >
            <FormattedMessage defaultMessage="Download" key="download-button" />
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {props.documents.map((doc, index) => {
        return (
          <div className="doc-flex-container" key={index}>
            <div className="name-flex-item">{doc.name}</div>
            <div className="size-flex-item">{humanFileSize(doc.size)}</div>
            <div className="type-flex-item">{doc.type}</div>
            {doc.state === "loading" && (
              <>
                <LittleSpinner index={index} />
                <div className="loading-flex-item">{" loading ..."}</div>
              </>
            )}
            {doc.state === "loaded" && (
              <>
                {commonButtons(index)}
                <div className="button-sign-flex-item">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={props.handleSign(index)}
                  >
                    <FormattedMessage defaultMessage="Sign" key="sign-button" />
                  </Button>
                </div>
                <div className="button-remove-flex-item">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={props.handleRemove(index)}
                  >
                    <FormattedMessage
                      defaultMessage="Remove"
                      key="remove-button"
                    />
                  </Button>
                </div>
              </>
            )}
            {doc.state === "signing" && (
              <>
                <LittleSpinner index={index} />
                <div className="signing-flex-item">{" signing ..."}</div>
              </>
            )}
            {doc.state === "signed" && (
              <>
                {commonButtons(index)}
                <div className="button-signed-flex-item">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={props.handleDlSigned(index)}
                  >
                    <FormattedMessage
                      defaultMessage="Download (signed)"
                      key="signed-button"
                    />
                  </Button>
                </div>
              </>
            )}
            <DocPreviewContainer doc={doc} index={index} />
          </div>
        );
      })}
    </>
  );
}

DocManager.propTypes = {
  documents: PropTypes.array,
  handlePreview: PropTypes.func,
  handleSign: PropTypes.func,
  handleRemove: PropTypes.func,
  handleDlSigned: PropTypes.func,
};

export default DocManager;
