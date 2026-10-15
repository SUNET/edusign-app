const edusignConfig = require("./edusign.config.js");

module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*-test.[jt]s?(x)"],
  // replicates webpack's resolve.modules, for bare imports like "components/Main"
  moduleDirectories: ["node_modules", "<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "json"],
  transform: {
    // pdfjs-dist 5's bundles take minutes under babel; esbuild does them
    // in under a second
    "node_modules/pdfjs-dist/.+\\.mjs$":
      "<rootDir>/src/tests/esbuild-transformer.js",
    // JS and TS alike: babel compiles TypeScript (see typescript-notes.md)
    "^(?!.*node_modules/pdfjs-dist/).+\\.(m?js|[jt]sx?)$": "babel-jest",
  },
  // ESM-only packages need the babel transform: react-intl 10 with its
  // @formatjs dependencies, and pdfjs-dist 5 (react-pdf 10).
  transformIgnorePatterns: [
    "/node_modules/(?!spin\\.js/|react-intl/|@formatjs/|intl-messageformat/|pdfjs-dist/)",
  ],
  moduleNameMapper: {
    "^react-pdf$": "<rootDir>/src/tests/mocks/react-pdf.js",
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
  // the old karma setup used 10s; the first PDF parse in a suite can exceed
  // that under jsdom's fake pdfjs worker when suites run in parallel on a
  // loaded machine
  testTimeout: 30000,
  collectCoverageFrom: [
    "src/**/*.{js,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/tests/**",
    "!src/entry-points/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text-summary"],
};
