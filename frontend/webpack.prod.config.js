const path = require("path");
const webpack = require("webpack");
const webpackConfig = require("./webpack.config");
const CompressionPlugin = require("compression-webpack-plugin");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

var webpackProd = {
  entry: webpackConfig.entry,
  resolve: webpackConfig.resolve,
  module: webpackConfig.module
};

delete webpackProd.entry.server;
delete webpackProd.entry.hot;

delete webpackProd.devtool;

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
  }),
  new webpack.optimize.AggressiveMergingPlugin(), //Merge chunks
  new webpack.optimize.OccurrenceOrderPlugin(true),
  new CompressionPlugin({
    minRatio: 0.8
  }),
  // new BundleAnalyzerPlugin()
];

webpackProd.mode = 'production';

webpackProd.optimization = {
  minimize: true,
  minimizer: [new TerserPlugin({
    extractComments: true,
  })],
};

module.exports = webpackProd;
