/**
 * @module slices/fetch-utils
 * @desc Here we define a few utility functions and objects
 * to help fetching data from the backend.
 */

export const checkStatus = function(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.json();
  } else if (response.status === 0) {
    console.log(response);
    const next = document.location.href;
    document.location.assign(next);
  } else {
    throw new Error(response.statusText);
  }
};

export const ajaxHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  Accept: "application/json",
  "Accept-Encoding": "gzip,deflate",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Requested-With": "XMLHttpRequest"
};

export const postRequest = {
  method: "post",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders
};

export const getRequest = {
  method: "get",
  redirect: "manual",
  credentials: "include",
  headers: ajaxHeaders
};
