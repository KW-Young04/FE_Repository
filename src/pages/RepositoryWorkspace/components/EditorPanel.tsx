import Editor from "@monaco-editor/react";
import type { LoadedFile } from "../types";
import { inferLanguage } from "../utils";

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
  return (
    <div className="col-span-5 flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white">
      <div className="flex min-h-11 shrink-0 items-stretch overflow-x-auto border-b border-slate-200">
        {openPaths.length === 0 && (
          <span className="px-3 py-2 text-sm font-medium text-slate-400">열린 파일이 없습니다.</span>
        )}
        {openPaths.map((path) => {
          const file = filesByPath[path];
          const isActive = activePath === path;
          const dirty = file?.dirty ?? false;
          return (
            <button
              key={path}
              type="button"
              className={[
                "flex items-center gap-2 border-r border-slate-200 px-3 text-xs font-semibold",
                isActive ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                void onFileClick(path);
              }}
            >
              <span>{path.split("/").pop()}</span>
              {dirty && <span className="text-sky-600">*</span>}
              <span
                role="button"
                tabIndex={0}
                className="text-slate-400 hover:text-slate-700"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(path);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onCloseTab(path);
                  }
                }}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeFile ? (
          <Editor
            key={activeFile.path}
            language={inferLanguage(activeFile.path)}
            value={activeFile.content}
            onChange={onEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
            파일을 선택해 주세요.
          </div>
        )}
      </div>
    </div>
  );
}
