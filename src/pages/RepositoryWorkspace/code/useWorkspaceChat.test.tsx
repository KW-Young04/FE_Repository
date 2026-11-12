// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceChat } from "./useWorkspaceChat";
import { getChatMessages, sendChatMessage } from "@/api/chat";
vi.mock("@/api/chat", () => ({
  getChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  applyChatFixes: vi.fn(),
}));
vi.mock("../analysis/useRealtimeAnalysis", () => ({ readStoredAnalysisResultId: () => 7 }));
const options = {
  repositoryUrl: "https://github.com/example/repo",
  branchName: "main",
  activePath: null,
  selectedLocationId: null,
  onFlushPendingWrites: async () => {},
  onApplyExternalContent: async () => {},
};
const response = {
  userMessage: { id: 11, senderType: "USER" as const, content: "hello", createdAt: "now" },
  aiMessage: { id: 12, senderType: "AI" as const, content: "hi", createdAt: "now" },
  fixes: [],
  fileContext: "NONE" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendChatMessage).mockResolvedValue(response);
});
afterEach(cleanup);
describe("conversation lifecycle", () => {
  it("starts empty on each visit without fetching repository history", async () => {
    const first = renderHook(() => useWorkspaceChat(options));
    await act(async () => {
      await first.result.current.send("hello");
    });
    first.unmount();
    const second = renderHook(() => useWorkspaceChat(options));
    expect(second.result.current.messages).toEqual([]);
    expect(getChatMessages).not.toHaveBeenCalled();
  });
  it("uses only current messages and resets context with new conversation", async () => {
    const { result } = renderHook(() => useWorkspaceChat(options));
    await act(async () => {
      await result.current.send("hello");
    });
    expect(sendChatMessage).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ historyMessageIds: [] }),
    );
    await act(async () => {
      await result.current.send("follow up");
    });
    expect(sendChatMessage).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ historyMessageIds: [11, 12] }),
    );
    act(() => result.current.startNewConversation());
    expect(result.current.messages).toEqual([]);
    await act(async () => {
      await result.current.send("new topic");
    });
    expect(sendChatMessage).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ historyMessageIds: [] }),
    );
  });
  it("ignores a late response after reset and permits a new request", async () => {
    let resolve!: (value: typeof response) => void;
    vi.mocked(sendChatMessage).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useWorkspaceChat(options));
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.send("old");
    });
    act(() => result.current.startNewConversation());
    await act(async () => {
      resolve(response);
      await pending;
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
    await act(async () => {
      await result.current.send("new");
    });
    expect(result.current.messages).toHaveLength(2);
  });
  it("clears messages when the branch changes", async () => {
    const { result, rerender } = renderHook((props) => useWorkspaceChat(props), {
      initialProps: options,
    });
    await act(async () => {
      await result.current.send("hello");
    });
    rerender({ ...options, branchName: "other" });
    expect(result.current.messages).toEqual([]);
  });
});
