import { apiClient } from './client';
import type { AccessibilityIssue } from '@/types/accessibility';

export interface AccessibilityAnalysisResponse {
  totalScore: number;
  issues: AccessibilityIssue[];
}

export async function getAccessibilityAnalysis(
  analysisId: string
): Promise<AccessibilityAnalysisResponse> {
  const response =
    await client.get<AccessibilityAnalysisResponse>(
      `/analyses/${analysisId}`
    );

  return response.data;
}