// Tailwind runs through PostCSS so `next dev` (Turbopack) and the webpack
// production build share one pipeline. Hostinger's build cannot spawn the
// Node workers Turbopack needs for CSS loaders, so production uses webpack.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
