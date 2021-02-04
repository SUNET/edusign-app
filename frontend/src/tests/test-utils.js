import React from "react";
import { Provider } from "react-intl-redux";
import { act, render, fireEvent, waitFor } from "@testing-library/react";
import configureStore from "redux-mock-store";
import { updateIntl } from "react-intl-redux";
import { edusignStore } from "init-app/init-app";

const messages = {
  en: require("../../translations/en.json"),
  sv: require("../../translations/sv.json"),
};

const middlewares = [];
const mockStore = configureStore(middlewares);

const initialState = {
  main: {
    loading: false,
    size: 'lg',
    signingData: {},
  },
  notifications: {
    message: null,
  },
  intl: {
    locale: "en",
    messages: messages.en,
  },
  dnd: {
    state: "waiting",
  },
  documents: {
    documents: [],
  },
};

/**
 * @public
 * @function setupComponent
 * @desc Render a component for testing, providing it with a fake Redux store.
 */
export function setupComponent(component, stateOverrides) {
  const state = {
    ...initialState,
    ...stateOverrides,
  };
  if (state.intl.locale === "sv") {
    state.intl.messages = messages.sv;
  }
  const fakeStore = mockStore(state);
  const wrapper = render(<Provider store={fakeStore}>{component}</Provider>);
  return wrapper;
}

/**
 * @public
 * @function setupReduxComponent
 * @desc Render a component for testing, providing it with a real Redux store.
 */
export function setupReduxComponent(component) {
  const store = edusignStore(true);
  store.dispatch(
    updateIntl({
      locale: "en",
      messages: messages.en,
    })
  );
  const wrapped = <Provider store={store}>{component}</Provider>;
  const { rerender, unmount } = render(wrapped);
  return { wrapped, rerender, store, unmount };
}

/**
 * @public
 * @function mockFileData
 * @desc Prepare file data to be used in a drag event.
 */
export function mockFileData(files) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    },
  };
}

/**
 * @public
 * @function flushPromises
 * @desc rerender component in tests after dispatching a Redux action or firing an event.
 */
export async function flushPromises(rerender, ui) {
  await act(async () => await waitFor(() => rerender(ui)));
}

/**
 * @public
 * @function dispatchEvtWithData
 * @desc Fire an event that carries additional data.
 */
export function dispatchEvtWithData(node, type, data) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, data);
  fireEvent(node, event);
}

/**
 * @public
 * @const b64SamplePDFData
 * @desc base64 string holding a sample PDF doc.
 */
export const b64SamplePDFData =
  "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgaHR0cDovL3d" +
  "3dy5yZXBvcnRsYWIuY29tCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCj" +
  "w8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lI" +
  "C9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0Nv" +
  "bnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQ" +
  "gNiAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0" +
  "ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvV" +
  "HlwZSAvUGFnZQo+PgplbmRvYmoKNCAwIG9iago8PAovUGFnZUxhYmVscyA4IDAgUiAvUGFnZU1v" +
  "ZGUgL1VzZU5vbmUgL1BhZ2VzIDYgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago1IDAgb2J" +
  "qCjw8Ci9BdXRob3IgKCkgL0NyZWF0aW9uRGF0ZSAoRDoyMDIwMTAyMDE1MTM1NS0wMScwMCcpIC" +
  "9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDIwM" +
  "TAyMDE1MTM1NS0wMScwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gd3d3" +
  "LnJlcG9ydGxhYi5jb20pIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoKSA" +
  "vVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyAzID" +
  "AgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovTGVuZ3RoIDE1Ngo+Pgpzd" +
  "HJlYW0KMSAwIDAgMSAwIDAgY20gIEJUIC9GMSAxMiBUZiAxNC40IFRMIEVUCnEKMSAwIDAgMSA2" +
  "Mi42OTI5MSA3NTMuMDIzNiBjbQpxCjAgMCAwIHJnCkJUIDEgMCAwIDEgMCAyIFRtIC9GMSAxMCB" +
  "UZiAxMiBUTCAoU2FtcGxlIFBERiBmb3IgdGVzdGluZykgVGogVCogRVQKUQpRCiAKZW5kc3RyZW" +
  "FtCmVuZG9iago4IDAgb2JqCjw8Ci9OdW1zIFsgMCA5IDAgUiBdCj4+CmVuZG9iago5IDAgb2JqC" +
  "jw8Ci9TIC9EIC9TdCAxCj4+CmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAow" +
  "MDAwMDAwMDczIDAwMDAwIG4gCjAwMDAwMDAxMDQgMDAwMDAgbiAKMDAwMDAwMDIxMSAwMDAwMCB" +
  "uIAowMDAwMDAwNDE0IDAwMDAwIG4gCjAwMDAwMDA1MDAgMDAwMDAgbiAKMDAwMDAwMDc1NyAwMD" +
  "AwMCBuIAowMDAwMDAwODE2IDAwMDAwIG4gCjAwMDAwMDEwMjIgMDAwMDAgbiAKMDAwMDAwMTA2M" +
  "SAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw2MzA5NDk0NDlkOTc0NTk5YzNhMDU5ZTg2Y2Y1" +
  "MWMyOT48NjMwOTQ5NDQ5ZDk3NDU5OWMzYTA1OWU4NmNmNTFjMjk+XQolIFJlcG9ydExhYiBnZW5" +
  "lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAoaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tKQ" +
  "oKL0luZm8gNSAwIFIKL1Jvb3QgNCAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjEwOTQKJSVFT" +
  "0YK";

/**
 * @public
 * @const samplePDFData
 * @desc binary string holding a sample PDF doc.
 */
export const samplePDFData = atob(b64SamplePDFData);
