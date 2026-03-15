from __future__ import annotations

from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .models import CascadeInputs, detect_anomalies, forecast_risk, predict_cascade_probabilities

app = FastAPI(title="StrataWatch ML Service", version="0.1.0")


class CascadeRequest(BaseModel):
    signal_severity: float = Field(ge=0, le=1)
    neighbor_risk: float = Field(ge=0, le=1)
    dependency_density: float = Field(ge=0, le=1)
    infrastructure_stress: float = Field(ge=0, le=1)


class AnomalyRequest(BaseModel):
    feature_matrix: List[List[float]]


class ForecastRequest(BaseModel):
    history: List[float]
    steps: int = Field(default=6, ge=1, le=24)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict/cascade")
def cascade_predict(request: CascadeRequest) -> dict:
    probs = predict_cascade_probabilities(
        CascadeInputs(
            signal_severity=request.signal_severity,
            neighbor_risk=request.neighbor_risk,
            dependency_density=request.dependency_density,
            infrastructure_stress=request.infrastructure_stress,
        )
    )
    return {"probabilities": probs}


@app.post("/detect/anomaly")
def anomaly_detect(request: AnomalyRequest) -> dict:
    scores = detect_anomalies(request.feature_matrix)
    return {"scores": scores}


@app.post("/forecast/risk")
def risk_forecast(request: ForecastRequest) -> dict:
    predictions = forecast_risk(request.history, request.steps)
    return {"predictions": predictions}
