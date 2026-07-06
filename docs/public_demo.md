# TrustLens Public Demo & Release Runbook

This runbook keeps the static demo, public GitHub repository, and capstone submission aligned.

## Public Demo

Target URL:

```txt
https://pixek.xyz/trustlens/
```

Upload the contents of `release/trustlens-web-dist.zip` into the server folder that maps to `/trustlens/`.

Important: upload the archive contents, not the zip file itself and not an extra nested `dist` folder.

## Static Hosting Contract

The web build is subpath-safe:

* Vite emits JS/CSS as `./assets/...`.
* `config.js` and `favicon.svg` are relative to the current folder.
* Screenshot fixtures are loaded through `import.meta.env.BASE_URL`.

`web/dist/config.js` should stay public-safe:

```js
window.TRUSTLENS_CONFIG = {
  API_BASE: "",
  SHOW_PROVIDER_SETTINGS: false
};
```

Use an API base URL only when a hosted FastAPI backend exists:

```js
API_BASE: "https://your-trustlens-api.example.com"
```

Provider keys stay only on the backend host:

```bash
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemma-4-31b-it
```

## Release Checklist

Run before publishing:

```bash
python -m unittest discover -s tests
python -m compileall -f src backend scripts
cd web
npm run lint
npm run build
cd ..
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package_release.ps1
```

Smoke test the built app from a subfolder:

```bash
mkdir .codex-smoke\trustlens
copy web\dist\* .codex-smoke\trustlens
python -m http.server 8766 --bind 127.0.0.1 --directory .codex-smoke
```

Open:

```txt
http://127.0.0.1:8766/trustlens/
```

Expected:

* The TrustLens home screen renders.
* Runtime footer shows `v1.0.2`.
* Quick samples load and produce a browser fallback report when no API is connected.
* Browser developer console has no current bundle errors.

## What To Show Judges

Best demo path:

1. Open the dashboard.
2. Click `DHL SMS`.
3. Show Security Review, Action Plan, Evidence/Analytics, and Official Case Packet.
4. Re-run with a screenshot fixture to demonstrate the multimodal path.
5. Show `python scripts/mcp_demo.py` for MCP proof.
6. Mention that live Gemma and Gemini keys stay server-side, while static hosting remains safe.
