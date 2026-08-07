require("@testing-library/jest-dom");

// fetch-mock 12 no longer patches the global fetch when a route is added,
// and hardReset() (the restore() replacement) unpatches it: mock it before
// every test. In tests with no routes an outgoing fetch rejects, as the
// unpatched whatwg fetch did over jsdom's XHR.
const { default: fetchMock } = require("@fetch-mock/jest");
beforeEach(() => {
  fetchMock.mockGlobal();
});
afterEach(() => {
  fetchMock.hardReset();
});

// pdfjs-dist 5 probes for its optional @napi-rs/canvas package at module
// scope; under jest the probe fails and logs one warning per test file.
// The tests only parse PDFs and never render to canvas: drop that message.
const realConsoleLog = console.log;
console.log = (...args) => {
  if (
    typeof args[0] === "string" &&
    /^Warning: Cannot (access|load)/.test(args[0])
  ) {
    return;
  }
  realConsoleLog(...args);
};

// components/Main.js componentDidMount calls appIsRendered, which fetches
// /sign/config on init-app's own module-level store — a store no test
// observes. When a test does not mock that route, the fetch goes out over
// jsdom's XHR and fails with a logged AggregateError. Stub it out; tests
// that need config dispatch fetchConfig on their own store.
jest.mock("init-app/init-app", () => ({
  ...jest.requireActual("init-app/init-app"),
  appIsRendered: async () => {},
}));
