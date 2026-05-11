from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "message": "Reach index directly"}

@app.get("/{path:path}")
def catch_all(path: str):
    return {"status": "ok", "path": path}

handler = app
