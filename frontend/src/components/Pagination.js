import React from "react";
import PropTypes from "prop-types";

/**
 * @desc Pagination controls
 * @component
 */
function Pagination(props) {

  return (
    <>
      {(Number(props.pageNumber) <= 1) && (
        <>
          <span
            className="go-to-first-page inactive"
            onClick={props.firstPage}
            data-testid={"preview-button-first-" + props.index}
          >
            &#x2AA6;
          </span>
          <span
            className="go-to-prev-page inactive"
            onClick={props.previousPage}
            data-testid={"preview-button-prev-" + props.index}
          >
            &#x003C;
          </span>
        </>
      ) || (
        <>
          <a
            className="go-to-first-page"
            onClick={props.firstPage}
            data-testid={"preview-button-first-" + props.index}
          >
            &#x2AA6;
          </a>
          <a
            className="go-to-prev-page"
            onClick={props.previousPage}
            data-testid={"preview-button-prev-" + props.index}
          >
            &#x003C;
          </a>
        </>
      )}
      <span>
        &nbsp;
        {(props.pageNumber || (props.numPages ? 1 : "--")) +
          " / " +
          (props.numPages || "--")}
        &nbsp;
      </span>
      {(Number(props.pageNumber) >= Number(props.numPages)) && (
        <>
          <span
            className="go-to-next-page inactive"
            onClick={props.firstPage}
            data-testid={"preview-button-first-" + props.index}
          >
            &#x2AA6;
          </span>
          <span
            className="go-to-last-page inactive"
            onClick={props.previousPage}
            data-testid={"preview-button-prev-" + props.index}
          >
            &#x003C;
          </span>
        </>
      ) || (
        <>
          <a
            className="go-to-next-page"
            onClick={props.nextPage}
            data-testid={"preview-button-next-" + props.index}
          >
            &#x003E;
          </a>
          <a
            className="go-to-last-page"
            onClick={props.lastPage}
            data-testid={"preview-button-last-" + props.index}
          >
            &#x2AA7;
          </a>
        </>
      )}
    </>
  );
}

Pagination.propTypes = {
  numPages: PropTypes.string,
  pageNumber: PropTypes.string,
  firstPage: PropTypes.func,
  previousPage: PropTypes.func,
  nextPage: PropTypes.func,
  lastPage: PropTypes.func,
  index: PropTypes.string,
};

export default Pagination;
