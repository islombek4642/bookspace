from fastapi import FastAPI

app = FastAPI(title="BookSpace API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
