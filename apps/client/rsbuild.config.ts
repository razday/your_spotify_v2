import { defineConfig } from "@rsbuild/core";
import { pluginBabel } from "@rsbuild/plugin-babel";
import { pluginReact } from "@rsbuild/plugin-react";

import packageJson from "./package.json";

export default defineConfig({
  html: { template: "./public/index.html" },
  source: {
    define: { __CLIENT_VERSION__: JSON.stringify(packageJson.version) },
  },
  output: { distPath: "./build" },
  resolve: { alias: { "@": "./src" } },
  performance: { chunkSplit: { strategy: "all-in-one" } },
  plugins: [
    pluginReact({ fastRefresh: true }),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift("babel-plugin-react-compiler");
      },
    }),
  ],
});
