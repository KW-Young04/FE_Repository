/* eslint-disable react-refresh/only-export-components -- Standalone browser test entry, not a reusable component module. */
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MemoryRouter } from "react-router-dom";
import "../src/index.css";
import DesignControlPanel from "../src/pages/RepositoryWorkspace/design/DesignControlPanel";
import { DEFAULT_DESIGN_VALUES } from "../src/pages/RepositoryWorkspace/design/useDesignInspector";
import { designPatchToCss } from "../src/pages/RepositoryWorkspace/design/designCss";
import { createDesignRuntimeScript } from "../src/workspace/designRuntime";
import { applyInlineStyleToSource } from "../src/workspace/designWriteback";
import WorkspaceLeftSidebar from "../src/pages/RepositoryWorkspace/layout/WorkspaceLeftSidebar";
import RepositoryHeader from "../src/components/RepositoryHeader";
import {
  useGitWorkspace,
  type GitWorkspaceState,
} from "../src/pages/RepositoryWorkspace/code/useGitWorkspace";
import { gitApi } from "../src/api/git";
import { useEditorSync } from "../src/workspace/repositoryWorkspace/useEditorSync";
import type {
  AccessibilityIssue,
  VisualDesignValues,
} from "../src/pages/RepositoryWorkspace/types";

const root = createRoot(document.getElementById("root")!);
const checks: string[] = [];
const pause = () => new Promise((resolve) => setTimeout(resolve, 80));
function check(value: unknown, label: string) {
  if (!value) throw new Error(label);
  checks.push(label);
}
function click(label: string) {
  const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Missing button: ${label}`);
  flushSync(() => button.click());
}
const issue: AccessibilityIssue = {
  id: "test",
  code: "1.1.1",
  title: "이미지 대체 텍스트",
  summary: "이미지에 설명을 추가하세요.",
  status: "pending",
  level: "A",
  category: "visual",
  targetFilePath: "index.html",
};
let latest = DEFAULT_DESIGN_VALUES;
let gitState: GitWorkspaceState;
let editorSync: ReturnType<typeof useEditorSync>;
function EditorSyncHarness() {
  const state = useEditorSync({
    repositoryUrl: "https://github.com/example/test",
    branchName: "main",
    activePath: null,
    filesByPathRef: { current: {} },
    setFilesByPath: () => {},
    webContainerRef: { current: null },
    previewRuntimeKindRef: { current: "static" },
    previewEntryPathRef: { current: "index.html" },
    setPreviewRevision: () => {},
    setRuntimeError: () => {},
  });
  useLayoutEffect(() => {
    editorSync = state;
  });
  return null;
}
const noLocalChanges: [] = [];
function GitHarness() {
  const state = useGitWorkspace({
    repositoryUrl: "https://github.com/example/test",
    branchName: "main",
    localChangedFiles: noLocalChanges,
  });
  useLayoutEffect(() => {
    gitState = state;
  });
  return null;
}
function Controls({ enabled = true }: { enabled?: boolean }) {
  const [values, setValues] = useState(DEFAULT_DESIGN_VALUES);
  useLayoutEffect(() => {
    latest = values;
  });
  return (
    <div style={{ width: 280 }}>
      <DesignControlPanel
        selectedElement={
          enabled
            ? { id: "1", sourceId: 1, selector: "div", tagName: "DIV", className: "", idName: "" }
            : null
        }
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  );
}
function IssueSidebar() {
  const [selected, setSelected] = useState(true);
  return (
    <div style={{ display: "flex", height: 650 }}>
      <WorkspaceLeftSidebar
        score={{ totalScore: 90, categories: [] }}
        groups={[]}
        selectedIssueId={selected ? issue.id : null}
        detailIssue={selected ? issue : null}
        onBackFromIssue={() => setSelected(false)}
        isAnalyzing={false}
        isSupported={true}
        analyzedPath="test"
        hasPendingEdits={false}
        canReaudit={false}
        error={null}
        onSelectIssue={() => setSelected(true)}
        onReaudit={() => {}}
      />
    </div>
  );
}
async function run() {
  flushSync(() => root.render(<Controls />));
  for (const [label, key, value] of [
    ["위쪽 정렬", "verticalAlignment", "top"],
    ["세로 가운데 정렬", "verticalAlignment", "middle"],
    ["아래쪽 정렬", "verticalAlignment", "bottom"],
    ["오른쪽 정렬", "alignment", "right"],
    ["가운데 정렬", "alignment", "center"],
    ["왼쪽 정렬", "alignment", "left"],
  ] as const) {
    const oldOther = key === "alignment" ? latest.verticalAlignment : latest.alignment;
    click(label);
    check(latest[key] === value, `${label}: value updates`);
    check(
      (key === "alignment" ? latest.verticalAlignment : latest.alignment) === oldOther,
      `${label}: other axis unchanged`,
    );
    check(
      document.querySelector(`[aria-label="${label}"]`)?.getAttribute("aria-pressed") === "true",
      `${label}: pressed state`,
    );
  }
  click("90도 회전");
  check(latest.rotation === 90, "rotation adds 90 degrees");
  click("좌우 반전");
  click("상하 반전");
  check(latest.flipH && latest.flipV, "both flips independent");
  click("좌우 반전");
  check(!latest.flipH && latest.flipV, "horizontal flip toggles independently");
  click("Fill 제거");
  check(latest.fillOpacity === 0, "fill removal");
  click("Stroke 제거");
  check(latest.borderWidth === 0 && latest.strokeOpacity === 0, "stroke removal");
  click("효과 제거");
  check(!latest.dropShadow && latest.effectOpacity === 0, "effect removal");
  const panel = document.querySelector("fieldset")!;
  check(panel.scrollWidth <= panel.clientWidth, "280px controls: no horizontal overflow");
  flushSync(() => root.render(<Controls key="disabled" enabled={false} />));
  check(
    document.querySelector("input")?.matches(":disabled"),
    "unselected controls disabled for keyboard too",
  );

  flushSync(() => root.render(<IssueSidebar />));
  check(
    document.querySelector("[inert]") !== null,
    "underlying accessibility controls inert while detail open",
  );
  const heading = document.querySelector(".selected-issue-panel h2")!.getBoundingClientRect();
  const back = document.querySelector('[aria-label="웹 접근성 검사로 돌아가기"]')!;
  check(heading.left < back.getBoundingClientRect().left, "issue heading left, back button right");
  check(
    back.querySelector("span")!.getBoundingClientRect().right <=
      back.querySelector("svg")!.getBoundingClientRect().left,
    "back arrow follows label",
  );
  click("웹 접근성 검사로 돌아가기");
  check(
    !document.querySelector(".selected-issue-panel") && !document.querySelector("[inert]"),
    "back restores accessibility sidebar",
  );

  let loggedOut = false;
  flushSync(() =>
    root.render(
      <MemoryRouter>
        <RepositoryHeader
          showLogout
          onLogout={() => {
            loggedOut = true;
          }}
        />
      </MemoryRouter>,
    ),
  );
  const headerHeight = document.querySelector("header")!.getBoundingClientRect().height;
  check(headerHeight === 64, "shared header height remains 64px");
  flushSync(() => document.querySelector<HTMLButtonElement>("header button")!.click());
  check(loggedOut, "logout callback connected");

  flushSync(() =>
    root.render(<div className="repository-workspace h-full overflow-hidden">Workspace</div>),
  );
  check(
    document.documentElement.scrollHeight <= window.innerHeight,
    "workspace has no document vertical overflow",
  );
  check(
    document.documentElement.scrollWidth <= window.innerWidth,
    "workspace has no document horizontal overflow",
  );

  // Exercise the real injected runtime in a browser document, not just CSS strings.
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "width:500px;height:400px";
  const loaded = new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
  });
  iframe.srcdoc = `<div id="target" data-codee-id="0" style="width:200px;height:200px"><span>Content</span></div><script>${createDesignRuntimeScript()}</script>`;
  document.body.append(iframe);
  await loaded;
  await pause();
  const frame = iframe.contentWindow!;
  const doc = iframe.contentDocument!;
  const target = doc.getElementById("target")!;
  const content = target.firstElementChild!;
  let runtimeValues: VisualDesignValues | undefined;
  window.addEventListener("message", (event) => {
    if (event.source === frame && event.data.type === "selected")
      runtimeValues = event.data.payload.values;
  });
  frame.postMessage(
    { source: "codee-design-panel", type: "set-interactive", payload: { interactive: false } },
    "*",
  );
  await pause();
  target.click();
  await pause();
  const apply = async (css: Record<string, string>) => {
    frame.postMessage({ source: "codee-design-panel", type: "apply-css", payload: { css } }, "*");
    await pause();
  };
  for (const display of ["block", "flex", "grid"]) {
    target.style.display = display;
    target.style.flexDirection = "row";
    for (const verticalAlignment of ["top", "middle", "bottom"] as const) {
      await apply(
        designPatchToCss(
          { ...DEFAULT_DESIGN_VALUES, display, flexDirection: "row", verticalAlignment },
          ["verticalAlignment"],
        ),
      );
      const box = target.getBoundingClientRect(),
        child = content.getBoundingClientRect();
      const expected =
        verticalAlignment === "top"
          ? box.top
          : verticalAlignment === "bottom"
            ? box.bottom - child.height
            : box.top + (box.height - child.height) / 2;
      check(Math.abs(child.top - expected) < 2, `${display}: actual ${verticalAlignment} position`);
    }
  }
  await apply(
    designPatchToCss(
      {
        ...DEFAULT_DESIGN_VALUES,
        flipV: true,
        rotation: 90,
        effectType: "layer-blur",
        dropShadow: true,
        effectOpacity: 50,
      },
      ["flipV", "rotation", "effectOpacity"],
    ),
  );
  target.click();
  await pause();
  check(
    runtimeValues?.flipV && !runtimeValues.flipH && runtimeValues.rotation === 90,
    "runtime reselect preserves vertical flip and rotation",
  );
  check(runtimeValues?.effectOpacity === 50, "runtime reselect preserves blur strength");
  const source = '<div style="color: red"><span>Content</span></div>';
  const patched = applyInlineStyleToSource(source, 0, {
    "text-align": "right",
    "background-color": "#ffffff",
  });
  check(
    patched?.includes("color: red") &&
      patched.includes("text-align: right") &&
      patched.includes("background-color: #ffffff"),
    "writeback preserves existing CSS and merges changed fields",
  );
  iframe.remove();

  const originalApi = { ...gitApi };
  const diffResolvers = new Map<string, (value: { path: string; diff: string }) => void>();
  Object.assign(gitApi, {
    getBranches: async () => ({ currentBranch: "main", branches: ["main"] }),
    getStatus: async () => ({
      branch: "main",
      hasChanges: true,
      files: [{ path: "a.html", status: "MODIFIED", addedLines: 1, deletedLines: 0 }],
    }),
    getGraph: async () => ({ commits: [] }),
    getDiff: (_params: unknown, path: string) =>
      new Promise((resolve) => diffResolvers.set(path, resolve)),
  });
  try {
    flushSync(() => root.render(<GitHarness />));
    await pause();
    check(gitState.selectedPaths.includes("a.html"), "Git: new changed file initially selected");
    flushSync(() => gitState.toggleSelectedPath("a.html"));
    await gitState.refresh();
    await pause();
    check(
      !gitState.selectedPaths.includes("a.html"),
      "Git: refresh preserves explicit deselection",
    );
    const first = gitState.openDiff("a.html");
    const second = gitState.openDiff("b.html");
    diffResolvers.get("b.html")!({ path: "b.html", diff: "new diff" });
    await second;
    await pause();
    diffResolvers.get("a.html")!({ path: "a.html", diff: "stale diff" });
    await first;
    await pause();
    check(
      gitState.diffPath === "b.html" && gitState.diff === "new diff",
      "Git: stale diff response cannot overwrite current file",
    );
    const pending = gitState.openDiff("c.html");
    flushSync(() => gitState.clearDiff());
    diffResolvers.get("c.html")!({ path: "c.html", diff: "closed diff" });
    await pending;
    await pause();
    check(
      gitState.diffPath === null && gitState.diff === null && !gitState.isDiffLoading,
      "Git: closed diff ignores pending response",
    );
    const writes: string[] = [];
    const finishWrites: (() => void)[] = [];
    Object.assign(gitApi, {
      writeFile: ({ content }: { content: string }) =>
        new Promise((resolve) => {
          writes.push(content);
          finishWrites.push(() => resolve({ success: true }));
        }),
    });
    flushSync(() => root.render(<EditorSyncHarness />));
    const oldWrite = editorSync.syncFileToGitWorkspace("index.html", "old");
    const newWrite = editorSync.syncFileToGitWorkspace("index.html", "new");
    await pause();
    check(writes.join(",") === "old", "saving: newer write waits for previous write");
    let flushed = false;
    const flush = editorSync.flushPendingWrites().then(() => {
      flushed = true;
    });
    await pause();
    check(!flushed, "saving: flush waits for pending design writes");
    finishWrites[0]();
    await oldWrite;
    await pause();
    check(writes.join(",") === "old,new", "saving: latest content reaches server last");
    finishWrites[1]();
    await newWrite;
    await flush;
    check(flushed, "saving: flush completes after latest write");
  } finally {
    Object.assign(gitApi, originalApi);
  }
  return checks;
}
void run()
  .then((passed) => {
    (window as unknown as Record<string, unknown>).__smokeResult = { passed };
  })
  .catch((error) => {
    (window as unknown as Record<string, unknown>).__smokeResult = {
      passed: checks,
      error: String(error),
      stack: error.stack,
    };
  });
