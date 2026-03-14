# StrataWatch

StrataWatch is a hackathon MVP intelligence dashboard that simulates emerging disruption signals and visualizes how they cascade across interconnected systems.

It is optimized for a polished, demo-first experience:
- Interactive global risk map with hex regions
- Live anomaly signal bursts (simulated)
- Regional risk scoring (0.0 to 1.0)
- Plain-language intelligence briefing
- Cascade simulation across infrastructure dependencies
- Dynamic activity feed for real-time feel

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS (v4)
- Mapbox GL JS (with fallback public dark style)
- Recharts (risk/cascade timeline)
- `react-force-graph-2d` (dependency network)
- Next.js API route for mock signal bursts

## Features

### 1. Signal Detection Layer
`/api/signal-burst` generates mock anomalies every few seconds:
- Shipping congestion
- Extreme weather
- News sentiment spikes
- Infrastructure disruptions

Each signal includes:
- `type`
- `severity`
- `timestamp`
- `location`
- `regionId`

### 2. Risk Scoring System
Each monitored hex region gets a score (`0.0 - 1.0`) based on:
- Signal density
- Signal severity
- Neighbor risk pressure
- Recent event load

Scores update continuously and animate on the map.

### 3. Intelligence Briefing Panel
Clicking any hex region opens an intelligence panel with:
- Risk score + trend
- Top signal drivers
- Recent events
- Plain-language summary

### 4. Cascade Simulation Engine
The **Simulate Disruption** button triggers network propagation across:
- Ports
- Power stations
- Hospitals
- Transportation hubs
- Data centers

Timeline checkpoints:
- Minute 0
- Minute 5
- Minute 15
- Minute 30

### 5. Network Visualization
A force graph visualizes system dependencies and cascade spread:
- Healthy nodes: green
- Stressed nodes: orange
- Failed nodes: red

### 6. Activity Feed
Live event feed logs anomaly detections and risk escalations to keep the dashboard feeling active.

## Project Structure

```text
src/
  app/
    api/signal-burst/route.ts
    layout.tsx
    page.tsx
  components/dashboard/
    ActivityFeed.tsx
    BriefingPanel.tsx
    CascadeNetwork.tsx
    MapPanel.tsx
    RiskTrendChart.tsx
    Sidebar.tsx
    StrataWatchDashboard.tsx
  hooks/
    use-stratawatch.ts
  lib/
    briefing.ts
    cascade-engine.ts
    region-catalog.ts
    risk-engine.ts
    signal-generator.ts
    types.ts
```

## Local Run

1. Install dependencies:
```bash
npm install
```

2. (Optional) configure Mapbox token:
```bash
cp .env.example .env.local
```
Then set `NEXT_PUBLIC_MAPBOX_TOKEN`.
If no token is provided, the app automatically uses a MapLibre fallback map style.

3. Start dev server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Build Check

```bash
npm run lint
npm run build
```

## Deploy on Vercel

1. Push this project to GitHub.
2. Import repo in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js**.
4. Add environment variable (optional but recommended):
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
5. Deploy.

No external database or infrastructure is required.

## Demo Flow

1. Open StrataWatch dashboard.
2. Observe live risk evolution on the map.
3. Click a high-risk region.
4. Review briefing drivers and events.
5. Click **Simulate Disruption**.
6. Present cascading node failures and timeline spread.
