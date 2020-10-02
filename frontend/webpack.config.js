const webpack = require("webpack");
const path = require("path");
// const initialConfigPlugin = require("./src/init-app/init-config").initialConfigPlugin;
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: "development",
  devServer: {
    contentBase: path.join(__dirname, "public"),
    compress: true,
    port: 9000
  },
  entry: {
    main: "./src/entry-points/index",
    polyfills: "./src/entry-points/polyfills",
  },
  output: {
    path: path.join(__dirname, "build"),
    // publicPath: "https://html.edusign.docker/static/front-build/",
    filename: "[name]-bundle.dev.js"
  },
  devtool: "source-map",
  resolve: {
    // allow us to import components in tests like:
    // import Example from 'components/Example';
    modules: [path.resolve(__dirname, "src"), "node_modules"],
    // allow us to avoid including extension name
    extensions: [".js", ".jsx", ".json"],
    mainFields: ["browser", "module", "main"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loaders: ["babel-loader"],
        exclude: /node_modules/
      },
    ]
  },
  plugins: [
    // Initial configuration
    // initialConfigPlugin,
    new webpack.HotModuleReplacementPlugin(),
    // new BundleAnalyzerPlugin()
  ]
};
