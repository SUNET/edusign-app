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
    use: {
      loader: "istanbul-instrumenter-loader",
      query: {
        esModules: true
        //produceSourceMap: true
      }
    },
    enforce: "post",
    include: path.resolve("src/")
  },
  {
    test: /\.js$/,
    use: { loader: "babel-loader" },
    enforce: "pre",
    exclude: /node_modules/
  },
  {
    test: /\.scss$/,
    enforce: "pre",
    loaders: ["style-loader", "css-loader", "postcss-loader", "sass-loader"]
  },
  {
    test: /\.css$/,
    enforce: "pre",
    loader: "style-loader!css-loader"
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    enforce: "pre",
    loader: "url-loader?limit=10000&mimetype=image/svg+xml"
  },
  {
    test: /\.png$/,
    loader: "url-loader?limit=100000"
  },
];

webpackKarma.plugins.push(
  new webpack.DefinePlugin({
    AVAILABLE_LANGUAGES: require("./edusign.config.js").AVAILABLE_LANGUAGES,
    LOCALIZED_MESSAGES: require("./edusign.config.js").LOCALIZED_MESSAGES,
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
      "src/test.webpack.js": ["webpack", "sourcemap"] //preprocess with webpack and our sourcemap loader
    },
    reporters: ["progress", "coverage-istanbul"], //report results in this format
    coverageIstanbulReporter: {
      reports: ["html", "text-summary"],
      fixWebpackSourcePaths: true,
      dir: path.join(__dirname, "coverage"),
      "report-config": {
        html: { subdir: "html" }
      }
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
      "karma-coverage-istanbul-reporter"
    ]
  });
};
