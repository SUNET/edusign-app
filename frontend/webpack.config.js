const autoprefixer = require("autoprefixer");
const path = require("path");
const precss = require("precss");
const webpack = require("webpack");
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
    publicPath: "https://sp.edusign.docker/js/",
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
      {
        test: /\.scss$/,
        loaders: ["style-loader", "css-loader", "postcss-loader", "sass-loader"]
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader"
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: "url-loader?limit=10000&mimetype=image/svg+xml"
      },
    ]
  },
  plugins: [
    // Initial configuration
    new webpack.DefinePlugin({
      AVAILABLE_LANGUAGES: require("./edusign.config.js").AVAILABLE_LANGUAGES,
      LOCALIZED_MESSAGES: require("./edusign.config.js").LOCALIZED_MESSAGES,
    }),
    new webpack.HotModuleReplacementPlugin(),
    // new BundleAnalyzerPlugin(),
    new webpack.LoaderOptionsPlugin({
      // test: /\.xxx$/, // may apply this only for some modules
      options: {
        postcss: function() {
          return [autoprefixer, precss];
        }
      }
    })
  ]
};
