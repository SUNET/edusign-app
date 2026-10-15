module.exports = function(api) {
  // The config only depends on NODE_ENV; declaring that (instead of
  // api.cache(false)) lets babel-jest cache transforms between test runs.
  api.cache.using(() => process.env.NODE_ENV);
  // TypeScript is compiled by Babel; tsc only type-checks (see
  // typescript-notes.md). The Flow plugin is gone: no source uses Flow, and
  // Babel cannot run the Flow and TypeScript syntax plugins on one file.
  const presets = [
    "@babel/preset-env",
    "@babel/preset-react",
    "@babel/preset-typescript",
  ];
  const plugins = [
    [
      "@babel/plugin-transform-runtime",
      {
        regenerator: true,
      },
    ],
    "@babel/plugin-proposal-object-rest-spread",
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
