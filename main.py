
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

app = FastAPI(title="Tokato: Command Center Server")

# Get the absolute path of the current directory to serve files correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serves the main Command Center entry point."""
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            return f.read()
    return HTMLResponse(content="Error: index.html not found in project root.", status_code=404)

# Mount the root directory to allow the browser to load index.tsx, types.ts, etc.
# Note: The browser handles the .ts/.tsx files via the ESM importmap in index.html.
app.mount("/", StaticFiles(directory=BASE_DIR), name="static")

if __name__ == "__main__":
    # The server expects the API_KEY to be available to the client via the environment.
    print("\n--- Tokato ---")
    print("Command Center online at: http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
