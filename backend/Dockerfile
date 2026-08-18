# backend/Dockerfile
# Built with context = repo root (see docker-compose.yml's `build.context: .`),
# so paths below are relative to D:\BookSpace, not backend/.

FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY locales/ /locales/
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY locales/ /locales/
COPY --from=frontend-build /frontend/dist ./static

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
