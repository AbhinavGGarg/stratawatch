# StrataWatch AI/ML Upgrade

## Architecture Overview

StrataWatch now includes a dedicated AI Intelligence layer that sits on top of the existing global map, cascade simulation, and building simulation modules.

### Runtime flow

1. `useStratawatch` ingests live + simulated signals.
2. `/api/ai/intelligence` receives selected region context and latest signals.
3. `runAIIntelligenceSnapshot` executes:
   - multi-source signal fusion
   - anomaly detection
   - predictive cascade inference
   - 24h risk forecasting
   - building vulnerability scoring
   - evacuation route optimization
   - multi-agent consensus generation
   - analyst briefing generation (optional LLM enhancement)
4. UI route `/ai-intelligence` renders model outputs with map overlays, network animation, and forecast charts.

## New Features Implemented

- Predictive Cascade AI (probabilistic graph simulation)
- Global Anomaly Detection Engine (unsupervised outlier scoring)
- AI Intelligence Analyst Agent (LLM-optional + deterministic fallback)
- Building Risk Scoring Model
- AI Evacuation Route Optimization (weighted shortest path)
- Multi-Agent Disaster Analysis + Consensus
- Multi-Source Data Fusion Engine
- Risk Trend Forecasting (AR-style forecasting)
- Social Signal Detection (bonus)
- AI Demo Mode toggle

## Folder Structure Additions

```txt
src/
  app/
    ai-intelligence/page.tsx
    api/ai/
      intelligence/route.ts
      anomaly-detect/route.ts
      cascade-predict/route.ts
      risk-forecast/route.ts
      building-assess/route.ts
  components/
    ai/
      AIIntelligenceDashboard.tsx
      AIIntelligencePageClient.tsx
      PredictiveCascadeGraph.tsx
  lib/
    ai/
      intelligence-engine.ts
      request-context.ts
      types.ts
ml-service/
  app/
    main.py
    models.py
  requirements.txt
  README.md
```

## API Contracts (Summary)

### `POST /api/ai/intelligence`
Input:
- `selectedRegionId`
- `allRegions`
- `signals`
- `scenarioType`
- `buildingId`
- `demoMode`

Output:
- fused signals
- anomaly hotspots
- cascade prediction + animated edge probabilities
- risk forecast points
- analyst brief
- social signals
- building risk + evacuation plan
- multi-agent consensus

### Specialized endpoints
- `POST /api/ai/anomaly-detect`
- `POST /api/ai/cascade-predict`
- `POST /api/ai/risk-forecast`
- `POST /api/ai/building-assess`

## UI Surface

### New Route
- `/ai-intelligence`

### Main sections
- AI Analyst Brief panel
- Predictive Cascade network graph (animated links)
- Anomaly hotspot panel
- Social signal panel
- Risk forecast chart
- Building risk and evacuation recommendations
- Multi-agent consensus card

## Demo Reliability Strategy

- Deterministic model surrogates and bounded randomization
- Optional LLM integration with automatic fallback
- Demo mode injects curated synthetic bursts for repeatable outputs
- All AI endpoints return with `Cache-Control: no-store` for live feel

## Deployment Instructions

### Vercel (frontend + Next API)

1. Push code to GitHub `main` branch.
2. In Vercel project settings, add optional env vars:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (default fallback in code is `gpt-4.1-mini`)
3. Redeploy.

### Optional Python ML microservice

Run independently (Fly/Render/Railway/VM):

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

You can then point Next.js server routes to this service if you want separated inference runtime.

## Performance Notes

- AI snapshot refresh interval: 12s (client controlled)
- Graph rendering is lazy and canvas-based for lower overhead
- Forecast chart and hotspot lists are lightweight derived views
- Current model scaffolds are fast enough for live demos on Vercel Hobby
