module.exports = function(api) {
  // The config only depends on NODE_ENV; declaring that (instead of
  // api.cache(false)) lets babel-jest cache transforms between test runs.
  api.cache.using(() => process.env.NODE_ENV);
  const presets = ["@babel/preset-env", "@babel/preset-react"];
  const plugins = [
    [
      "@babel/plugin-transform-runtime",
      {
        regenerator: true,
      },
    ],
    "@babel/plugin-proposal-object-rest-spread",
    "@babel/plugin-transform-flow-strip-types",
    "transform-class-properties",
    [
      "react-intl-auto",
      {
        "removePrefix": "src",
        "filebase": true,
        "useKey": true,
      }
    ],
  ];

  return {
    presets,
    plugins
  };
};
