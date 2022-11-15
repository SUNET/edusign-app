module.exports = function(api) {
  api.cache(false);
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
