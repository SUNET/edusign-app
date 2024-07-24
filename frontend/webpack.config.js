const autoprefixer = require("autoprefixer");
const path = require("path");
const webpack = require("webpack");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  mode: "development",
  optimization: {
    minimize: false
  },
  devServer: {
    contentBase: path.join(__dirname, "public"),
    hot: true,
    port: 9000
  },
  entry: {
    main: "./src/entry-points/index",
    polyfills: "./src/entry-points/polyfills",
  },
  output: {
    path: path.join(__dirname, "build"),
    publicPath: "/js/",
    filename: "[name]-bundle.dev.js"
  },
  devtool: "eval-source-map",
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
        use: {
          loader: "babel-loader",
          options: { plugins: ['react-refresh/babel'] },
        },
        exclude: /node_modules/
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
        type: "asset/resource"
      },
      {
        test: /\.png$/,
        type: "asset/resource"
      },
      {
        test: /\.jpg$/,
        type: "asset/resource"
      },
      {
        test: /\.gif$/,
        type: "asset/resource"
      },
    ]
  },
  plugins: [
    // Initial configuration
    new webpack.DefinePlugin({
      AVAILABLE_LANGUAGES: require("./edusign.config.js").AVAILABLE_LANGUAGES,
      LOCALIZED_MESSAGES: require("./edusign.config.js").LOCALIZED_MESSAGES,
      DELAY_SHOW_HELP: require("./edusign.config.js").DELAY_SHOW_HELP,
      DELAY_HIDE_HELP: require("./edusign.config.js").DELAY_HIDE_HELP,
      'process.env': {
          NODE_ENV: JSON.stringify('development')
      }
    }),
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin(),
    // new BundleAnalyzerPlugin(),
    new webpack.LoaderOptionsPlugin({
      // test: /\.xxx$/, // may apply this only for some modules
      options: {
        postcss: function() {
          return [autoprefixer];
        }
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps'),
          to: 'cmaps/'
        },
      ]
    }),
  ]
};
