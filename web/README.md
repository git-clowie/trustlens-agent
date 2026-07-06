# TrustLens Web Dashboard

React + TypeScript + Vite frontend for the TrustLens capstone demo.

The dashboard is designed for two modes:

* **FastAPI served app:** `python backend/run.py` serves the built `web/dist` bundle and API from `http://127.0.0.1:8000`.
* **Static public demo:** upload `web/dist` to any static host, including a subfolder such as `https://pixek.xyz/trustlens/`.

## Runtime Config

Vite copies `web/public/config.js` into `web/dist/config.js` during build.

```js
window.TRUSTLENS_CONFIG = {
  API_BASE: "",
  SHOW_PROVIDER_SETTINGS: false
};
```

Use `API_BASE` only for a public backend URL. Never put `OPENROUTER_API_KEY` or `GEMINI_API_KEY` in the frontend bundle.

Provider Settings are hidden in public builds. Open the app with `?settings=1` for admin testing.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

Production build output:

```txt
web/dist/
```

The Vite config uses `base: './'`, so built assets resolve correctly at a domain root or inside a subpath.

## Demo Behavior

If the browser cannot reach the backend API, quick samples still render a clearly marked browser fallback report. Live Gemma analysis and Gemini OCR require the FastAPI backend with provider keys set server-side.
