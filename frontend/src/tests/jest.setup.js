require("@testing-library/jest-dom");

// components/Main.js componentDidMount calls appIsRendered, which fetches
// /sign/config on init-app's own module-level store — a store no test
// observes. When a test does not mock that route, the fetch goes out over
// jsdom's XHR and fails with a logged AggregateError. Stub it out; tests
// that need config dispatch fetchConfig on their own store.
jest.mock("init-app/init-app", () => ({
  ...jest.requireActual("init-app/init-app"),
  appIsRendered: async () => {},
}));
