declare module "*.css" {
  const classes: any;
  export default classes;
}

// Version of the web application, set at build time
declare const __CLIENT_VERSION__: string;
