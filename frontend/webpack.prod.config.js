const path = require("path");
const webpack = require("webpack");
const webpackConfig = require("./webpack.config");
const CompressionPlugin = require("compression-webpack-plugin");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

var webpackProd = {
  entry: webpackConfig.entry,
  resolve: webpackConfig.resolve,
  module: webpackConfig.module
};

delete webpackProd.entry.server;
delete webpackProd.entry.hot;

// remove react-refresh plugin from babel-laoder
webpackProd.module.rules[0].use.options = {};

webpackProd.devtool = 'nosources-source-map';

webpackProd.output = {
  filename: "[name]-bundle.js",
  path: path.join(__dirname, "build")
};

webpackProd.plugins = [
  new webpack.DefinePlugin({
    "process.env": {
      NODE_ENV: JSON.stringify("production")
    },
    AVAILABLE_LANGUAGES: require("./edusign.config.js").AVAILABLE_LANGUAGES,
    LOCALIZED_MESSAGES: require("./edusign.config.js").LOCALIZED_MESSAGES,
    DELAY_SHOW_HELP: require("./edusign.config.js").DELAY_SHOW_HELP,
    DELAY_HIDE_HELP: require("./edusign.config.js").DELAY_HIDE_HELP,
  }),
  new webpack.optimize.AggressiveMergingPlugin(), //Merge chunks
  new CompressionPlugin({
    minRatio: 0.8,
  }),
  // new BundleAnalyzerPlugin(),
  new CopyWebpackPlugin({
    patterns: [
      {
        from: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps'),
        to: 'cmaps/'
      },
    ]
  }),
];

webpackProd.mode = 'production';

webpackProd.optimization = {
  minimize: true,
  minimizer: [new TerserPlugin()],
};

module.exports = webpackProd;
