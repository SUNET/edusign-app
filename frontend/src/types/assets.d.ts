// Non-code imports handled by webpack loaders. Stylesheets are imported for
// their side effect (style-loader) and images resolve to a URL (asset/resource).

declare module "*.scss";
declare module "*.css";

declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.jpg" {
  const url: string;
  export default url;
}
declare module "*.gif" {
  const url: string;
  export default url;
}
