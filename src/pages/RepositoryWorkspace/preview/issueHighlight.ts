import { resolveMarkupAnchor } from "@/workspace/designWriteback";
import type { AccessibilityIssue, LoadedFile } from "../types";

export interface PreviewIssueHighlight {
  id: string;
  code: string;
  title: string;
  level: string;
  selector: string | null;
  sourceId: number | null;
  occurrenceIndex: number | null;
  codeBlock: string | null;
  selected: boolean;
}

/** 문서 전체(html/페이지)가 대상인 성공 기준. 코드 조각이 DOCTYPE부터 잘려 있어도 html에 표시한다. */
const DOCUMENT_ROOT_SELECTOR_BY_SC: Record<string, string> = {
  "3.1.1": "html",
  "2.4.2": "html",
};

function quoteCssAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function readHtmlAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

function stripMarkupPreamble(codeBlock: string): string {
  return codeBlock.trim().replace(/^(?:\s*(?:<!doctype[^>]*>|<!--[\s\S]*?-->))*\s*/i, "");
}

function selectorFromCodeBlock(codeBlock: string | undefined): string | null {
  if (!codeBlock) return null;

  const tagMatch = stripMarkupPreamble(codeBlock).match(/^<([a-z][\w-]*)\b[^>]*>/i);
  if (!tagMatch) return null;

  const tag = tagMatch[1].toLowerCase();
  const fullTag = tagMatch[0];
  const id = readHtmlAttribute(fullTag, "id");
  if (id) return `[id="${quoteCssAttributeValue(id)}"]`;

  for (const attribute of ["aria-label", "alt", "href", "src", "name", "type"]) {
    const value = readHtmlAttribute(fullTag, attribute);
    if (value && !value.startsWith("{")) {
      return `${tag}[${attribute}="${quoteCssAttributeValue(value)}"]`;
    }
  }

  const className =
    readHtmlAttribute(fullTag, "class") ?? readHtmlAttribute(fullTag, "className");
  const firstClass = className?.split(/\s+/).find((part) => part && !part.startsWith("{"));
  if (firstClass) return `${tag}[class~="${quoteCssAttributeValue(firstClass)}"]`;

  return tag;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function findFileContent(
  filesByPath: Record<string, LoadedFile>,
  targetFilePath: string | undefined,
): string | null {
  if (!targetFilePath) return null;

  const wanted = normalizePath(targetFilePath);
  const direct = filesByPath[wanted] ?? filesByPath[targetFilePath];
  if (direct?.content && direct.encoding !== "base64") return direct.content;

  const match = Object.keys(filesByPath).find((path) => {
    const normalized = normalizePath(path);
    return (
      normalized === wanted ||
      normalized.endsWith(`/${wanted}`) ||
      wanted.endsWith(`/${normalized}`)
    );
  });
  const file = match ? filesByPath[match] : undefined;
  if (!file?.content || file.encoding === "base64") return null;
  return file.content;
}

/** data-codee-id 는 서빙 중인 HTML 엔트리에만 심어진다. */
function isPreviewEntryHtml(path: string | undefined): boolean {
  if (!path) return false;
  const base = normalizePath(path).split("/").pop()?.toLowerCase() ?? "";
  return base === "index.html" || base === "index.htm";
}

function isDocumentRootIssue(issue: AccessibilityIssue): boolean {
  const sc = issue.code?.trim();
  if (sc && DOCUMENT_ROOT_SELECTOR_BY_SC[sc]) return true;

  const hint = `${issue.suggestion ?? ""} ${issue.summary ?? ""} ${issue.title ?? ""}`;
  return /html\s*태그.*lang|lang 속성이 없|페이지 언어|page language/i.test(hint);
}

function resolveIssueSelector(issue: AccessibilityIssue): string | null {
  const fromApi = issue.targetSelector?.trim();
  if (fromApi && fromApi !== "null") return fromApi;

  const sc = issue.code?.trim();
  if (sc && DOCUMENT_ROOT_SELECTOR_BY_SC[sc]) {
    return DOCUMENT_ROOT_SELECTOR_BY_SC[sc];
  }
  if (isDocumentRootIssue(issue)) return "html";

  const fromBlock = selectorFromCodeBlock(issue.originalCodeBlock);
  if (fromBlock === "head" || fromBlock === "html") {
    return "html";
  }
  return fromBlock;
}

function locateStartLine(source: string | null, codeBlock: string | undefined): number | undefined {
  const needle = codeBlock?.split("\n")[0]?.trim();
  if (!source || !needle) return undefined;

  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].includes(needle)) return index + 1;
  }
  return undefined;
}

export function buildPreviewIssueHighlights(
  issues: AccessibilityIssue[],
  filesByPath: Record<string, LoadedFile>,
  selectedIssueId?: string | null,
): PreviewIssueHighlight[] {
  return issues
    .map((issue) => {
      const selector = resolveIssueSelector(issue);
      const source = findFileContent(filesByPath, issue.targetFilePath);
      const startLine =
        issue.startLine && issue.startLine > 0
          ? issue.startLine
          : locateStartLine(source, issue.originalCodeBlock);
      const anchor = source
        ? resolveMarkupAnchor(source, {
            startLine,
            codeBlock: issue.originalCodeBlock,
          })
        : null;
      const tagName = anchor?.tagName;
      const useSourceId =
        isPreviewEntryHtml(issue.targetFilePath) &&
        anchor != null &&
        tagName !== "html" &&
        tagName !== "head" &&
        tagName !== "body" &&
        tagName !== "script" &&
        tagName !== "style" &&
        tagName !== "meta" &&
        tagName !== "link" &&
        tagName !== "title";

      return {
        id: issue.id,
        code: issue.code,
        title: issue.title,
        level: issue.level,
        selector,
        sourceId: useSourceId ? anchor.sourceId : null,
        occurrenceIndex: anchor?.occurrenceIndex ?? null,
        codeBlock: issue.originalCodeBlock?.trim() || null,
        selected: Boolean(selectedIssueId && issue.id === selectedIssueId),
      } satisfies PreviewIssueHighlight;
    })
    .filter((issue) => issue.selector || issue.sourceId != null || issue.codeBlock);
}
