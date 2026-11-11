import { apiClient } from "./client";
import type { RealtimeAnalysisResponse } from "./analysis";

interface ApiResponse<T> {
  data: T;
}

export type ChatSenderType = "USER" | "AI" | "SYSTEM";

export interface ChatMessageItem {
  id: number;
  senderType: ChatSenderType;
  content: string;
  createdAt: string;
}

export interface ChatFixProposal {
  filePath: string;
  before: string;
  after: string;
  description: string;
}

/** FULL: 열린 파일 전체를 AI가 봄 / SNIPPETS: 파일이 커서 위반 코드만 봄 / NONE: 열린 파일 없음 */
export type ChatFileContext = "FULL" | "SNIPPETS" | "NONE";

export interface ChatSendRequest {
  message: string;
  repositoryUrl: string;
  branchName: string;
  activeFilePath?: string | null;
  selectedLocationId?: number | null;
}

export interface ChatSendResponse {
  userMessage: ChatMessageItem;
  aiMessage: ChatMessageItem;
  fixes: ChatFixProposal[];
  fileContext: ChatFileContext;
}

export interface ChatApplyRequest {
  repositoryUrl: string;
  branchName: string;
  filePath: string;
  fixes: { before: string; after: string }[];
}

export interface ChatApplyResponse {
  filePath: string;
  appliedCount: number;
  failReasons: string[];
  remainingIssues: RealtimeAnalysisResponse;
  /** 적용 후 파일 전체 내용 */
  content: string;
}

/** AI 호출을 포함하므로 기본 10초로는 부족하다. */
const CHAT_TIMEOUT_MS = 120_000;

export async function getChatMessages(repositoryId: number): Promise<ChatMessageItem[]> {
  const response = await apiClient.get<ApiResponse<ChatMessageItem[]>>(
    `/api/chat/${repositoryId}/messages`,
  );
  return response.data.data ?? [];
}

export async function sendChatMessage(
  repositoryId: number,
  payload: ChatSendRequest,
): Promise<ChatSendResponse> {
  const response = await apiClient.post<ApiResponse<ChatSendResponse>>(
    `/api/chat/${repositoryId}/messages`,
    payload,
    { timeout: CHAT_TIMEOUT_MS },
  );
  return response.data.data;
}

export async function applyChatFixes(
  repositoryId: number,
  payload: ChatApplyRequest,
): Promise<ChatApplyResponse> {
  const response = await apiClient.post<ApiResponse<ChatApplyResponse>>(
    `/api/chat/${repositoryId}/fixes/apply`,
    payload,
    { timeout: CHAT_TIMEOUT_MS },
  );
  return response.data.data;
}