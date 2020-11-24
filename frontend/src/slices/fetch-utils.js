/**
 * @module slices/fetch-utils
 * @desc Here we define a few utility functions and objects
 * to help fetching data from the backend.
 */

import { setCsrfToken } from "slices/Main";

export const checkStatus = async function (response) {
  if (response.status >= 200 && response.status < 300) {
    return await response.json();
  } else if (response.status === 0) {
    const next = document.location.href;
    document.location.assign(next);
  } else {
    throw new Error("Error response from backend: " + response.statusText);
  }
};

export const extractCsrfToken = (dispatch, data) => {
  if ("csrf_token" in data) {
    dispatch(setCsrfToken(data.csrf_token));
  }
};

export const ajaxHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  Accept: "application/json",
  "Accept-Encoding": "gzip,deflate",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Requested-With": "XMLHttpRequest",
};

export const postRequest = {
  method: "post",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders,
};

export const getRequest = {
  method: "get",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders,
};

export const preparePayload = (state, payload) => {
  const data = {
    csrf_token: state.main.csrf_token,
    payload: payload,
  };
  return JSON.stringify(data);
};
