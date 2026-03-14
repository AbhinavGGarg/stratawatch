export const REGION_BRIEFING_SYSTEM_PROMPT = `You are StrataWatch Analyst Core. Write concise, operational intelligence briefings for disruption monitoring teams. Keep tone serious, evidence-led, and action-oriented.`;

export const buildRegionBriefingPrompt = (input: {
  regionName: string;
  riskScore: number;
  trend: string;
  topSignals: string[];
  sectorsUnderPressure: string[];
  cascadeHighlights: string[];
  confidence: number;
}): string => `
Region: ${input.regionName}
Risk Score: ${Math.round(input.riskScore * 100)}%
Trend: ${input.trend}
Top Signals: ${input.topSignals.join(", ")}
Sectors Under Pressure: ${input.sectorsUnderPressure.join(", ")}
Cascade Highlights: ${input.cascadeHighlights.join(", ")}
Confidence: ${Math.round(input.confidence * 100)}%

Produce:
1) Executive Brief (2-3 lines)
2) Technical Assessment (3 bullets)
3) Watchlist (3 bullets)
4) Scenario Outlook (2 bullets)
5) Uncertainty Notes (1 bullet)
`.trim();
