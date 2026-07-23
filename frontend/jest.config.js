const edusignConfig = require("./edusign.config.js");

module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*-test.js"],
  // replicates webpack's resolve.modules, for bare imports like "components/Main"
  moduleDirectories: ["node_modules", "<rootDir>/src"],
  moduleFileExtensions: ["js", "mjs", "json"],
  transform: {
    "^.+\\.m?js$": "babel-jest",
  },
  // ESM-only packages need the babel transform. pdfjs-dist 2.x (react-pdf 6)
  // is CJS and needs no transform; when react-pdf goes to 10 (ESM pdfjs),
  // add pdfjs-dist to the exceptions.
  transformIgnorePatterns: ["/node_modules/(?!spin\\.js/)"],
  moduleNameMapper: {
    "^react-pdf$": "<rootDir>/src/tests/mocks/react-pdf.js",
    // the browser build, wrapping the whatwg-fetch polyfill; the node build
    // would require node-fetch, which is not installed
    "^fetch-mock$": "<rootDir>/node_modules/fetch-mock/cjs/client.js",
    "\\.(css|scss|sass)$": "identity-obj-proxy",
    "\\.(svg|png|jpe?g|gif)$": "<rootDir>/src/tests/mocks/fileMock.js",
  },
  setupFiles: ["<rootDir>/src/tests/jest.polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/jest.setup.js"],
  // the same values that webpack's DefinePlugin injects at build time;
  // edusign.config.js pre-stringifies them, hence the JSON.parse
  globals: {
    AVAILABLE_LANGUAGES: JSON.parse(edusignConfig.AVAILABLE_LANGUAGES),
    LOCALIZED_MESSAGES: JSON.parse(edusignConfig.LOCALIZED_MESSAGES),
    DELAY_SHOW_HELP: edusignConfig.DELAY_SHOW_HELP,
    DELAY_HIDE_HELP: edusignConfig.DELAY_HIDE_HELP,
  },
  // matches the mocha client timeout in the old karma setup
  testTimeout: 10000,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/tests/**",
    "!src/entry-points/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text-summary"],
};
