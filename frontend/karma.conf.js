var webpack = require("webpack");
var webpackConfig = require("./webpack.config");
var path = require("path");

var webpackKarma = {
  mode: "development",
  resolve: webpackConfig.resolve,
  module: webpackConfig.module,
  plugins: []
};

webpackKarma.devtool = "inline-source-map";

webpackKarma.module.rules = [
  {
    test: /\.js$/,
    use: [{ loader: "babel-loader" }],
    exclude: /node_modules/,
  },
  {
    test: /\.scss$/,
    use: [
      {loader: "style-loader"},
      {loader: "css-loader"},
      {loader: "postcss-loader"},
      {loader: "sass-loader"},
    ],
  },
  {
    test: /\.css$/,
    use: [
      {loader: "style-loader"},
      {loader: "css-loader"},
    ],
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    type: "asset/resource",
  },
  {
    test: /\.png$/,
    type: "asset/resource",
  },
];

webpackKarma.plugins.push(
  new webpack.DefinePlugin({
    AVAILABLE_LANGUAGES: require("./edusign.config.js").AVAILABLE_LANGUAGES,
    LOCALIZED_MESSAGES: require("./edusign.config.js").LOCALIZED_MESSAGES,
    DELAY_SHOW_HELP: require("./edusign.config.js").DELAY_SHOW_HELP,
    DELAY_HIDE_HELP: require("./edusign.config.js").DELAY_HIDE_HELP,
  }),
);

process.env.CHROME_BIN = require("puppeteer").executablePath();

module.exports = function(config) {
  config.set({
    browsers: ["HeadlessChromeNoSandbox"], //run in Browser

    browserNoActivityTimeout: 30000,

    customLaunchers: {
      HeadlessChromeNoSandbox: {
        base: "ChromeHeadless",
        flags: ["--no-sandbox"]
      }
    },

    // just run once by default unless --watch flag is passed
    //singleRun: !argv.watch,
    singleRun: true,
    autoWatch: false,

    // which karma frameworks do we want integrated
    frameworks: ["mocha"], //use the mocha test framework
    // files with tests
    files: ["src/test.webpack.js"],
    preprocessors: {
      // these files we want to be precompiled with webpack
      // also run tests through sourcemap for easier debugging
      "src/test.webpack.js": ["webpack", "sourcemap"], //preprocess with webpack and our sourcemap loader
      'src/**/*.js': 'coverage'
    },
    reporters: ["progress", "coverage"], //report results in this format
    coverageReporter: {
      dir: path.join(__dirname, "coverage"),
      reporters: [
        { type: 'html', subdir: 'report-html' },
        { type: 'text-summary', subdir: '.' }
      ]
    },
    webpack: webpackKarma,
    webpackServer: {
      noInfo: true //please don't spam the console when running in karma!
    },
    plugins: [
      "karma-webpack",
      "karma-sourcemap-loader",
      "karma-chrome-launcher",
      "karma-coverage",
      "karma-mocha",
    ]
  });
};
