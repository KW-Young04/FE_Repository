import type { ReactNode } from "react";

import type { AccessibilityIssue, SelectedPreviewElement, VisualDesignValues } from "../types";
import WorkspaceChatSidebar from "../code/WorkspaceChatSidebar";
import DesignInspectorSidebar from "../design/DesignInspectorSidebar";
import SelectedIssuePanel from "../overview/SelectedIssuePanel";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { AiCodeFixController } from "../analysis/useAiCodeFix";

type ChatPanel = {
  panel: "chat";
};

type IssuePanel = {
  panel: "issue";
  selectedIssue: AccessibilityIssue;
  aiFix?: AiCodeFixController;
  onEditInCode?: () => void;
  onClose: () => void;
};

type DesignPanel = {
  panel: "design";
  selectedElement: SelectedPreviewElement | null;
  values: VisualDesignValues;
  onChange: (patch: Partial<VisualDesignValues>) => void;
};

type WorkspaceRightSidebarProps = ChatPanel | IssuePanel | DesignPanel;

const PANEL_LABEL = {
  chat: "AI 채팅 사이드바",
  issue: "이슈 상세 사이드바",
  design: "디자인 도구 사이드바",
} as const;

export default function WorkspaceRightSidebar(props: WorkspaceRightSidebarProps) {
  return (
    <WorkspaceSidebar side="right" label={PANEL_LABEL[props.panel]}>
      {renderPanel(props)}
    </WorkspaceSidebar>
  );
}

function renderPanel(props: WorkspaceRightSidebarProps): ReactNode {
  switch (props.panel) {
    case "chat":
      return <WorkspaceChatSidebar />;
    case "design":
      return (
        <DesignInspectorSidebar
          selectedElement={props.selectedElement}
          values={props.values}
          onChange={props.onChange}
        />
      );
    case "issue":
      return (
        <SelectedIssuePanel
          key={props.selectedIssue.id} // 이슈가 바뀌면 AI 수정 상태 초기화
          issue={props.selectedIssue}
          aiFix={props.aiFix}
          onEditInCode={props.onEditInCode}
          onClose={props.onClose}
        />
      );
  }
}
