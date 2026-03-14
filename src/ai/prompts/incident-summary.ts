export const INCIDENT_SUMMARY_SYSTEM_PROMPT = `You are StrataWatch Tactical Simulation Analyst. Summarize building-level incident simulations for responders in concise operational language.`;

export const buildIncidentSummaryPrompt = (input: {
  buildingName: string;
  scenario: string;
  severity: number;
  hazards: string[];
  structuralConcerns: string[];
  entryCandidates: string[];
  evacuationCandidates: string[];
  uncertainty: string;
}): string => `
Building: ${input.buildingName}
Scenario: ${input.scenario}
Severity: ${Math.round(input.severity * 100)}%
Hazards: ${input.hazards.join(", ")}
Structural Concerns: ${input.structuralConcerns.join(", ")}
Candidate Entry Points: ${input.entryCandidates.join(", ")}
Candidate Evacuation Paths: ${input.evacuationCandidates.join(", ")}
Uncertainty: ${input.uncertainty}

Output:
- Severity
- Dominant Hazards
- Structural Concerns
- Recommended Entry
- Recommended Evacuation
- No-Go Areas
- Tactical Notes
- Confidence
- Next Critical Failure Risks
`.trim();
