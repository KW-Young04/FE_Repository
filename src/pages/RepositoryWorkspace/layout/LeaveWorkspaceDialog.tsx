import { useEffect } from "react";

import Button from "@/components/Button";
import Modal from "@/components/Modal";

interface LeaveWorkspaceDialogProps {
  isOpen: boolean;
  changedFileCount: number;
  isLeaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LeaveWorkspaceDialog({
  isOpen,
  changedFileCount,
  isLeaving,
  error,
  onCancel,
  onConfirm,
}: LeaveWorkspaceDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLeaving) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLeaving, onCancel]);

  return (
    <Modal isOpen={isOpen} size="sm" onBackdropClick={isLeaving ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-workspace-title"
        className="p-6 text-[#17181c]"
      >
        <h2 id="leave-workspace-title" className="text-lg font-bold">
          저장소 선택 화면으로 돌아갈까요?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          현재 워크스페이스를 나가 저장소 선택 화면으로 이동합니다.
        </p>
        {changedFileCount > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-700">
            커밋하지 않은 변경 파일이 {changedFileCount}개 있습니다. 필요하다면 이동하기 전에
            커밋해 주세요.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
            className="h-10 cursor-pointer rounded-lg border border-[#e5e5eb] bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <Button
            variant="point"
            onClick={onConfirm}
            disabled={isLeaving}
            autoFocus
            className="h-10 rounded-lg px-4 text-sm"
          >
            {isLeaving ? "이동 중..." : "저장소 선택으로 이동"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
