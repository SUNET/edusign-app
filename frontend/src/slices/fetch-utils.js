/**
 * @module slices/fetch-utils
 * @desc Here we define a few utility functions and objects
 * to help fetching data from the backend.
 */

import { setCsrfToken } from "slices/Main";

/**
 * @public
 * @function checkStatus
 * @param response: Response obtained in a call to `fetch`.
 * @desc Check that the response status is successful, and return the body loaded as json.
 *       If the response is a redirect, follow it, and for any other status, throw an error.
 */
export const checkStatus = async function (response) {
  if (response.status >= 200 && response.status < 300) {
    return response.json();
  } else if (response.status === 0) {
    const next = document.location.href;
    document.location.assign(next);
  } else {
    throw new Error("Error response from backend: " + response.statusText);
  }
};

/**
 * @public
 * @function extractCsrfToken
 * @param dispatch: Redux function to dispatch to the store.
 * @param data: data fetched from the backend.
 * @desc extract the csrf token from the data and dispatch it to the central store.
 */
export const extractCsrfToken = (dispatch, data) => {
  if ("csrf_token" in data) {
    dispatch(setCsrfToken(data.csrf_token));
  }
};

/**
 * @public
 * @const ajaxHeaders
 * @desc Headers for ajax requests.
 */
export const ajaxHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  Accept: "application/json",
  "Accept-Encoding": "gzip,deflate",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * @public
 * @const postRequest
 * @desc POST request
 */
export const postRequest = {
  method: "post",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders,
};

/**
 * @public
 * @const getRequest
 * @desc GET request
 */
export const getRequest = {
  method: "get",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders,
};

/**
 * @public
 * @function preparePayload
 * @param state: Redux state from the central store.
 * @param payload: data to be sent to the backend.
 * @desc combine the data and the CSRF token into a JSON string to be added to a request to be sent to the backend.
 */
export const preparePayload = (state, payload) => {
  const data = {
    csrf_token: state.main.csrf_token,
    payload: payload,
  };
  return JSON.stringify(data);
};

export const esFetch = async (resource, options) => {
  if (window.document.location.pathname.includes("/sign2/")) {
    resource.replace("/sign/", "/sign2/");
  }
  return await fetch(resource, options);
};

export const getLocation = (resource) => {
  if (window.document.location.pathname.includes("/sign2/")) {
    resource.replace("/sign/", "/sign2/");
  }
  return resource;
};
