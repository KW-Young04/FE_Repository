import type { AccessibilityScoreSummary, ScoreChartSegment } from "../types";

const REMAINING_SEGMENT_ID = "remaining";

export function buildScoreChartData(score: AccessibilityScoreSummary): ScoreChartSegment[] {
  const maxScore = score.maxScore ?? 100;
  const categoryTotal = score.categories.reduce((sum, category) => sum + category.score, 0);
  const remaining = Math.max(0, maxScore - categoryTotal);

  const segments: ScoreChartSegment[] = score.categories.map((category) => ({
    id: category.id,
    label: category.label,
    value: category.score,
    color: category.color,
  }));

  if (remaining > 0) {
    segments.push({
      id: REMAINING_SEGMENT_ID,
      label: "미달성",
      value: remaining,
      color: "#E2E8F0",
    });
  }

  return segments;
}

export function isRemainingChartSegment(segment: ScoreChartSegment) {
  return segment.id === REMAINING_SEGMENT_ID;
}
