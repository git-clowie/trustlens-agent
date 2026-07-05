import os
import sys
import uvicorn
from dotenv import load_dotenv

# Ensure we read environment variables
load_dotenv()

# Add workspace src to path
workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src_dir = os.path.join(workspace_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

def main():
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"[*] Starting TrustLens Server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)

if __name__ == '__main__':
    main()
