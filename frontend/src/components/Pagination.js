import React from "react";
import PropTypes from "prop-types";

/**
 * @desc Pagination controls
 * @component
 */

function GoFirst(props) {
  return (
      <svg
         className="pagination-control go-to-first"
         version="1.1"
         xmlns="http://www.w3.org/2000/svg">
        <g
           id="arrowfirst"
           transform="rotate(90,12,12)">
          <path
             fill={props.color}
             d="m 11.292,16.706 a 1,1 0 0 0 1.416,0 l 3,-3 A 1,1 0 0 0 14.294,12.292 L 13,13.586 V 4 a 1,1 0 0 0 -2,0 v 9.586 L 9.707,12.293 a 1,1 0 0 0 -1.414,1.414 z"
             id="arrowfirst-path1" />
          <path
             fill={props.color}
             d="M 17,19 H 7 a 1,1 0 0 0 0,2 h 10 a 1,1 0 0 0 0,-2 z"
             id="arrowfirst-path2" />
        </g>
      </svg>
  );
}

function GoLast(props) {
  return (
      <svg
         className="pagination-control go-to-last"
         version="1.1"
         xmlns="http://www.w3.org/2000/svg">
        <g
           id="arrowlast"
           transform="rotate(-90,12,12)">
          <path
             fill={props.color}
             d="m 11.292,16.706 a 1,1 0 0 0 1.416,0 l 3,-3 A 1,1 0 0 0 14.294,12.292 L 13,13.586 V 4 a 1,1 0 0 0 -2,0 v 9.586 L 9.707,12.293 a 1,1 0 0 0 -1.414,1.414 z"
             id="arrowlast-path1" />
          <path
             fill={props.color}
             d="M 17,19 H 7 a 1,1 0 0 0 0,2 h 10 a 1,1 0 0 0 0,-2 z"
             id="arrowlast-path2" />
        </g>
      </svg>
  );
}

function GoPrev(props) {
  return (
      <svg
         className="pagination-control go-to-prev"
         xmlns="http://www.w3.org/2000/svg"
         version="1.1">
        <g
           id="arrowprev"
           data-name="Left">
          <path
             fill={props.color}
             d="M19,12a1,1,0,0,1-1,1H8.414l1.293,1.293a1,1,0,1,1-1.414,1.414l-3-3a1,1,0,0,1,0-1.414l3-3A1,1,0,0,1,9.707,9.707L8.414,11H18A1,1,0,0,1,19,12Z" />
        </g>
      </svg>
  );
}

function GoNext(props) {
  return (
      <svg
         className="pagination-control go-to-next"
         xmlns="http://www.w3.org/2000/svg"
         version="1.1">
        <g
           id="arrowlast"
           data-name="Right">
          <path
             fill={props.color}
             d="M18.707,12.707l-3,3a1,1,0,0,1-1.414-1.414L15.586,13H6a1,1,0,0,1,0-2h9.586L14.293,9.707a1,1,0,0,1,1.414-1.414l3,3A1,1,0,0,1,18.707,12.707Z" />
        </g>
      </svg>
  );
}

function Pagination(props) {

  return (
    <>
      {(Number(props.pageNumber) <= 1) && (
        <>
          <span
            className="go-to-first-page inactive"
            data-testid={"preview-button-first-" + props.index}
          >
            <GoFirst color="#aaa" />
          </span>
          <span
            className="go-to-prev-page inactive"
            data-testid={"preview-button-prev-" + props.index}
          >
            <GoPrev color="#aaa" />
          </span>
        </>
      ) || (
        <>
          <a
            className="go-to-first-page"
            onClick={props.firstPage}
            data-testid={"preview-button-first-" + props.index}
          >
            <GoFirst color="#555" />
          </a>
          <a
            className="go-to-prev-page"
            onClick={props.previousPage}
            data-testid={"preview-button-prev-" + props.index}
          >
            <GoPrev color="#555" />
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
            data-testid={"preview-button-next-" + props.index}
          >
            <GoNext color="#aaa" />
          </span>
          <span
            className="go-to-last-page inactive"
            data-testid={"preview-button-last-" + props.index}
          >
            <GoLast color="#aaa" />
          </span>
        </>
      ) || (
        <>
          <a
            className="go-to-next-page"
            onClick={props.nextPage}
            data-testid={"preview-button-next-" + props.index}
          >
            <GoNext color="#555" />
          </a>
          <a
            className="go-to-last-page"
            onClick={props.lastPage}
            data-testid={"preview-button-last-" + props.index}
          >
            <GoLast color="#555" />
          </a>
        </>
      )}
    </>
  );
}

Pagination.propTypes = {
  numPages: PropTypes.number,
  pageNumber: PropTypes.number,
  firstPage: PropTypes.func,
  previousPage: PropTypes.func,
  nextPage: PropTypes.func,
  lastPage: PropTypes.func,
  index: PropTypes.number,
};

export default Pagination;
