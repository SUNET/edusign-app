/**
 * Jest transformer for pdfjs-dist only. Its bundles (~1-3 MB of generated
 * ESM) take minutes under babel; esbuild converts them to CJS in well under
 * a second. Everything else keeps the babel transform.
 */
const esbuild = require("esbuild");

module.exports = {
  process(src, filename) {
    const { code, map } = esbuild.transformSync(src, {
      loader: "js",
      format: "cjs",
      target: "node20",
      sourcemap: "inline",
      sourcefile: filename,
    });
    return { code, map };
  },
};
