import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyChatFixes,
  getChatMessages,
  sendChatMessage,
  type ChatFixProposal,
  type ChatMessageItem,
} from "@/api/chat";

import { readStoredAnalysisResultId } from "../analysis/useRealtimeAnalysis";

interface UseWorkspaceChatOptions {
  repositoryUrl: string;
  branchName: string;
  /** 현재 에디터에서 열린 파일. AI가 이 파일 전체를 보고 수정안을 만든다. */
  activePath: string | null;
  /** 현재 선택한 이슈의 위반 위치 ID. "이거 왜 문제야?"의 "이거"를 알려준다. */
  selectedLocationId: number | null;
  onFlushPendingWrites: () => Promise<void>;
  onApplyExternalContent: (path: string, content: string) => Promise<void>;
}

export type ChatFixStatus =
  | { state: "idle" }
  | { state: "applying" }
  | { state: "applied" }
  | { state: "failed"; reason: string };

export interface ChatFixEntry extends ChatFixProposal {
  key: string;
  status: ChatFixStatus;
}

export interface WorkspaceChatMessage extends ChatMessageItem {
  /** AI 답변에 딸린 수정안. 새로고침 후 불러온 기록에는 없다(서버에 저장하지 않음). */
  fixes: ChatFixEntry[];
  /** 수정안을 만들 수 없었던 이유 안내용 */
  fileContext?: "FULL" | "SNIPPETS" | "NONE";
}

export interface WorkspaceChatController {
  isAvailable: boolean;
  unavailableReason: string | null;
  messages: WorkspaceChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  error: string | null;
  activePath: string | null;
  /** 성공하면 true. 실패하면 입력 내용을 되살릴 수 있도록 false를 돌려준다. */
  send: (text: string) => Promise<boolean>;
  applyFixes: (messageId: number, fixKeys: string[]) => Promise<void>;
  clearError: () => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message) return message;
    if (error.code === "ECONNABORTED") {
      return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

let pendingIdSeed = -1;

export function useWorkspaceChat({
  repositoryUrl,
  branchName,
  activePath,
  selectedLocationId,
  onFlushPendingWrites,
  onApplyExternalContent,
}: UseWorkspaceChatOptions): WorkspaceChatController {
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 챗봇은 저장된 분석 결과(= repositoryId)가 있어야 동작한다.
  const repositoryId = repositoryUrl ? readStoredAnalysisResultId(repositoryUrl) : null;
  const isAvailable = Boolean(repositoryId != null && repositoryUrl && branchName);
  const unavailableReason = isAvailable
    ? null
    : "저장소 분석을 먼저 실행하면 AI 채팅을 사용할 수 있습니다.";

  useEffect(() => {
    if (repositoryId == null) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingHistory(true);
    getChatMessages(repositoryId)
      .then((items) => {
        if (cancelled) return;
        setMessages(items.map((item) => ({ ...item, fixes: [] })));
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(toErrorMessage(requestError, "대화 기록을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const message = text.trim();
      if (!message || repositoryId == null || isSending) return false;

      const pendingId = pendingIdSeed--;
      setError(null);
      setIsSending(true);
      setMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          senderType: "USER",
          content: message,
          createdAt: new Date().toISOString(),
          fixes: [],
        },
      ]);

      try {
        // AI가 서버 작업 파일을 읽으므로, 편집 중인 내용을 먼저 저장한다.
        await onFlushPendingWrites();
        const response = await sendChatMessage(repositoryId, {
          message,
          repositoryUrl,
          branchName,
          activeFilePath: activePath,
          selectedLocationId,
        });

        const fixes: ChatFixEntry[] = response.fixes.map((fix, index) => ({
          ...fix,
          key: `${response.aiMessage.id}-${index}`,
          status: { state: "idle" },
        }));

        setMessages((prev) => [
          ...prev.filter((item) => item.id !== pendingId),
          { ...response.userMessage, fixes: [] },
          { ...response.aiMessage, fixes, fileContext: response.fileContext },
        ]);
        return true;
      } catch (requestError) {
        // 서버는 실패 시 질문을 저장하지 않으므로 화면에서도 지운다.
        setMessages((prev) => prev.filter((item) => item.id !== pendingId));
        setError(toErrorMessage(requestError, "AI 응답을 받지 못했습니다."));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [
      activePath,
      branchName,
      isSending,
      onFlushPendingWrites,
      repositoryId,
      repositoryUrl,
      selectedLocationId,
    ],
  );

  const updateFixStatus = useCallback(
    (messageId: number, fixKeys: string[], status: ChatFixStatus) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.id !== messageId
            ? item
            : {
                ...item,
                fixes: item.fixes.map((fix) =>
                  fixKeys.includes(fix.key) ? { ...fix, status } : fix,
                ),
              },
        ),
      );
    },
    [],
  );

  const applyOne = useCallback(
    async (repoId: number, messageId: number, fix: ChatFixEntry) => {
      updateFixStatus(messageId, [fix.key], { state: "applying" });
      try {
        const response = await applyChatFixes(repoId, {
          repositoryUrl,
          branchName,
          filePath: fix.filePath,
          fixes: [{ before: fix.before, after: fix.after }],
        });

        if (response.appliedCount > 0) {
          await onApplyExternalContent(fix.filePath, response.content);
          updateFixStatus(messageId, [fix.key], { state: "applied" });
          return;
        }
        updateFixStatus(messageId, [fix.key], {
          state: "failed",
          reason: response.failReasons[0] ?? "수정안을 적용하지 못했습니다.",
        });
      } catch (requestError) {
        updateFixStatus(messageId, [fix.key], {
          state: "failed",
          reason: toErrorMessage(requestError, "수정안을 적용하지 못했습니다."),
        });
      }
    },
    [branchName, onApplyExternalContent, repositoryUrl, updateFixStatus],
  );

  // 수정안마다 결과(적용/실패 사유)를 정확히 보여주기 위해 한 건씩 순서대로 적용한다.
  const applyFixes = useCallback(
    async (messageId: number, fixKeys: string[]) => {
      if (repositoryId == null) return;
      const message = messagesRef.current.find((item) => item.id === messageId);
      const targets = (message?.fixes ?? []).filter(
        (fix) =>
          fixKeys.includes(fix.key) &&
          fix.status.state !== "applied" &&
          fix.status.state !== "applying",
      );
      if (targets.length === 0) return;

      try {
        await onFlushPendingWrites();
      } catch (flushError) {
        setError(toErrorMessage(flushError, "편집 중인 내용을 저장하지 못했습니다."));
        return;
      }

      for (const fix of targets) {
        await applyOne(repositoryId, messageId, fix);
      }
    },
    [applyOne, onFlushPendingWrites, repositoryId],
  );

  return {
    isAvailable,
    unavailableReason,
    messages,
    isLoadingHistory,
    isSending,
    error,
    activePath,
    send,
    applyFixes,
    clearError: () => setError(null),
  };
}