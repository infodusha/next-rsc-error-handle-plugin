const defaultOptions = {
  componentName: /^[A-Z]/,
};

export function rscErrorHandler(options = {}) {
  return function withLoader(nextConfig = {}) {
    return {
      ...nextConfig,
      webpack(config, opts) {
        config.module.rules.unshift({
          test: /\.(c|m)?(t|j)sx?$/,
          exclude: /(\/|\\)(node_modules(\/|\\)|global-server-error\.)/,
          use: [
            {
              loader: "next-rsc-error-handler/src/loader.js",
              options: {
                ...defaultOptions,
                ...options,
              },
            },
          ],
        });

        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, opts);
        }

        return config;
      },
    };
  };
}
