import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add workspace src directory to path to ensure trustlens_agent package imports correctly
workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src_dir = os.path.join(workspace_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from trustlens_agent.adk_agent import TrustLensCoordinatorAgent

app = FastAPI(
    title="TrustLens Security Agent API",
    description="Backend API for the TrustLens AI security concierge agent.",
    version="1.0.0"
)

# Enable CORS for local Vite development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development we allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InvestigationRequest(BaseModel):
    text: str
    situation: str

@app.post("/api/investigate")
async def investigate(req: InvestigationRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")
    
    valid_situations = ['before_click', 'clicked_only', 'compromised']
    if req.situation not in valid_situations:
        raise HTTPException(status_code=400, detail=f"Invalid situation. Must be one of {valid_situations}")
        
    try:
        coordinator = TrustLensCoordinatorAgent()
        report = coordinator.run_investigation(req.text, req.situation)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent investigation failed: {str(e)}")

# Fallback route for health check
@app.get("/api/health")
async def health_check():
    coordinator = TrustLensCoordinatorAgent()
    return {
        "status": "healthy",
        "adk_available": coordinator.has_adk,
        "api_key_set": bool(os.getenv("GEMINI_API_KEY"))
    }

# Mount Vite static site if built
dist_dir = os.path.join(workspace_dir, "web", "dist")
if os.path.exists(dist_dir):
    print(f"[*] Serving web client static assets from: {dist_dir}")
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
else:
    print(f"[!] Warning: Web client static asset folder '{dist_dir}' not found. Serving health endpoint only.")
    @app.get("/")
    async def index():
        return {
            "message": "TrustLens API is online. To view the dashboard, build the react frontend in 'web/dist' or run the dev server."
        }
