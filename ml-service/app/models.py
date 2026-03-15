from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np


@dataclass
class CascadeInputs:
    signal_severity: float
    neighbor_risk: float
    dependency_density: float
    infrastructure_stress: float


def predict_cascade_probabilities(inputs: CascadeInputs) -> Dict[str, float]:
    """Deterministic lightweight surrogate model for hackathon demos.

    Replace with a trained GNN or probabilistic graphical model in production.
    """

    x = np.array(
        [
            inputs.signal_severity,
            inputs.neighbor_risk,
            inputs.dependency_density,
            inputs.infrastructure_stress,
        ],
        dtype=np.float32,
    )

    weights = np.array([0.34, 0.24, 0.22, 0.20], dtype=np.float32)
    base = float(np.clip(x.dot(weights), 0.0, 1.0))

    return {
        "power_grid_failure": float(np.clip(base * 1.05, 0.0, 1.0)),
        "hospital_overload": float(np.clip(base * 0.86 + 0.04, 0.0, 1.0)),
        "transport_disruption": float(np.clip(base * 0.78 + 0.03, 0.0, 1.0)),
        "telecom_outage": float(np.clip(base * 0.69 + 0.05, 0.0, 1.0)),
    }


def detect_anomalies(feature_matrix: List[List[float]]) -> List[float]:
    """Simple unsupervised anomaly score compatible with Isolation-Forest style outputs."""

    if not feature_matrix:
        return []

    matrix = np.array(feature_matrix, dtype=np.float32)
    center = np.mean(matrix, axis=0)
    spread = np.std(matrix, axis=0) + 1e-6

    z = np.abs((matrix - center) / spread)
    scores = 1.0 / (1.0 + np.exp(-(z.mean(axis=1))))
    return [float(np.clip(score, 0.0, 1.0)) for score in scores]


def forecast_risk(history: List[float], steps: int = 6) -> List[float]:
    """AR(1)-style forecasting surrogate used for API smoke tests and demos."""

    if not history:
        history = [0.4]

    values = list(history)
    for _ in range(steps):
        last = values[-1]
        mean_recent = float(np.mean(values[-4:]))
        slope = 0.0 if len(values) < 2 else values[-1] - values[-2]
        next_val = float(np.clip(last * 0.72 + mean_recent * 0.2 + slope * 0.35, 0.0, 1.0))
        values.append(next_val)

    return values[-steps:]
