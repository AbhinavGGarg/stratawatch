# StrataWatch ML Service (Scaffold)

Optional Python microservice scaffold for hackathon demos and future production hardening.

## Run locally

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

## Endpoints

- `GET /health`
- `POST /predict/cascade`
- `POST /detect/anomaly`
- `POST /forecast/risk`

This service is intentionally lightweight and deterministic for demo reliability.
