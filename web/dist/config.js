window.TRUSTLENS_CONFIG = {
  // Keep empty when FastAPI serves web/dist from the same origin.
  // For static hosting with a separate backend, set this to your TrustLens API, for example:
  // API_BASE: "https://api.example.com"
  API_BASE: "",

  // Keep hidden for public demo builds. Use ?settings=1 or set true for admin testing.
  SHOW_PROVIDER_SETTINGS: false
};
