import React from "react";
import PropTypes from "prop-types";

/**
 * @desc Pagination controls
 * @component
 */
function Navigation(props) {

  return (
    <>
      <a
        disabled={Number(props.pageNumber) <= 1}
        onClick={props.firstPage}
        data-testid={"preview-button-first-" + props.index}
      >
        &#x2AA6;
      </a>
      <a
        disabled={Number(props.pageNumber) <= 1}
        onClick={props.previousPage}
        data-testid={"preview-button-prev-" + props.index}
      >
        &#x003C;
      </a>
      <span>
        &nbsp;
        {(props.pageNumber || (props.numPages ? 1 : "--")) +
          " / " +
          (props.numPages || "--")}
        &nbsp;
      </span>
      <a
        disabled={Number(props.pageNumber) >= Number(props.numPages)}
        onClick={props.nextPage}
        data-testid={"preview-button-next-" + props.index}
      >
        &#x003E;
      </a>
      <a
        disabled={Number(props.pageNumber) >= Number(props.numPages)}
        onClick={props.lastPage}
        data-testid={"preview-button-last-" + props.index}
      >
        &#x2AA7;
      </a>
    </>
  );
}

Navigation.propTypes = {
  numPages: PropTypes.number,
  pageNumber: PropTypes.number,
  firstPage: PropTypes.func,
  previousPage: PropTypes.func,
  nextPage: PropTypes.func,
  lastPage: PropTypes.func,
  index: PropTypes.number,
};

export default Navigation;
