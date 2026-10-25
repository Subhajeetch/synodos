# React + TypeScript + Vite

## Cloudflare Pages deployment

In Cloudflare Pages, leave the repository root directory at its default (the
repository root), use `pnpm --filter web build` as the build command, and set
`apps/web/dist` as the build output directory. This ensures Pages discovers the
root-level `functions/` directory. Set the build environment variable
`NODE_VERSION` to `24`. Set the Pages runtime variable `BACKEND_URL` to the API
service origin, for example `https://synodos-1.onrender.com` (no path or API
route); configure it for every Pages environment you deploy.

The production web app always uses same-origin `/api` requests, which the Pages
Function proxies to `BACKEND_URL`; it ignores `VITE_API_URL` in production to
prevent OAuth cookies from being set on a separate API domain. Remove any
`VITE_API_URL` setting from the Pages build environment. For local development,
the web app defaults to `http://localhost:4000`; set `VITE_API_URL` only if the
local API is at a different address.

On the Render API service, set both `BETTER_AUTH_URL` and `WEB_ORIGIN` to the
public Pages site origin (for example, `https://your-site.pages.dev`). Set
`BETTER_AUTH_URL` to that same origin on the collab service so it can fetch the
auth JWKS through the Pages proxy. Update the Google and GitHub OAuth
authorized callback URLs to:

- `https://your-site.pages.dev/api/auth/callback/google`
- `https://your-site.pages.dev/api/auth/callback/github`

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
