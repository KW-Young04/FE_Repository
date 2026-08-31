import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import { inferLanguage } from "@/pages/RepositoryWorkspaceTest/utils";

import { findAiDiff } from "../../data/codeWorkspace";
import type { AiDiffLines, LoadedFile } from "../../types";
import { CheckIcon, CloseIcon, CopyIcon, RevertIcon } from "./icons";

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];
type DecorationsCollection = ReturnType<MonacoEditorInstance["createDecorationsCollection"]>;

function buildDiffDecorations(monaco: MonacoApi, diff: AiDiffLines | null) {
  if (!diff) return [];

  return [
    ...diff.removed.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "codee-diff-removed",
        linesDecorationsClassName: "codee-diff-removed-glyph",
      },
    })),
    ...diff.added.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "codee-diff-added",
        linesDecorationsClassName: "codee-diff-added-glyph",
      },
    })),
  ];
}

interface EditorPanelProps {
  openPaths: string[];
  filesByPath: Record<string, LoadedFile>;
  activePath: string | null;
  activeFile: LoadedFile | null;
  onFileClick: (path: string) => void | Promise<void>;
  onCloseTab: (path: string) => void;
  onEditorChange: (nextValue: string | undefined) => void;
}

export default function EditorPanel({
  openPaths,
  filesByPath,
  activePath,
  activeFile,
  onFileClick,
  onCloseTab,
  onEditorChange,
}: EditorPanelProps) {
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<DecorationsCollection | null>(null);

  const aiDiff = findAiDiff(activePath);
  const hasAiSuggestion = Boolean(aiDiff);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations = buildDiffDecorations(monaco, aiDiff);

    if (decorationsRef.current) {
      decorationsRef.current.set(decorations);
      return;
    }

    decorationsRef.current = editor.createDecorationsCollection(decorations);
  }, [aiDiff, activePath]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection(
      buildDiffDecorations(monaco, aiDiff),
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        className="flex min-h-9 shrink-0 items-stretch overflow-x-auto border-b border-slate-200 bg-[#F4F4F7]"
        role="tablist"
        aria-label="열린 파일 탭"
      >
        {openPaths.length === 0 && (
          <span className="px-3 py-2.5 text-[11px] font-medium text-slate-400">
            왼쪽에서 파일을 선택해 주세요.
          </span>
        )}

        {openPaths.map((path) => {
          const file = filesByPath[path];
          const isActive = activePath === path;
          const dirty = file?.dirty ?? false;

          return (
            <div
              key={path}
              className={[
                "group flex items-center gap-1.5 border-r border-slate-200 pr-2 pl-3",
                isActive ? "bg-white" : "bg-[#F4F4F7] hover:bg-white/60",
              ].join(" ")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={[
                  "py-2 text-[12px]",
                  isActive ? "font-bold text-slate-900" : "font-medium text-slate-500",
                ].join(" ")}
                onClick={() => {
                  void onFileClick(path);
                }}
              >
                {path.split("/").pop()}
              </button>

              {dirty && <span className="text-[11px] text-violet-600">●</span>}

              <button
                type="button"
                aria-label={`${path} 닫기`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                onClick={() => onCloseTab(path)}
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
        <span className="text-[11px] font-medium text-slate-500">AI Version</span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="코드 복사"
            disabled={!activeFile}
            onClick={() => {
              if (activeFile) void navigator.clipboard?.writeText(activeFile.content);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            aria-label="AI 제안 되돌리기"
            disabled={!hasAiSuggestion}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <RevertIcon />
          </button>
          <button
            type="button"
            aria-label="AI 제안 적용"
            disabled={!hasAiSuggestion}
            className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
          >
            <CheckIcon />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeFile ? (
          <Editor
            key={activeFile.path}
            language={inferLanguage(activeFile.path)}
            value={activeFile.content}
            onChange={onEditorChange}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              lineNumbersMinChars: 3,
              lineDecorationsWidth: 6,
              automaticLayout: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              renderLineHighlight: "none",
              padding: { top: 8 },
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] font-medium text-slate-400">
            파일을 선택하면 편집할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
