import type { LoadedFile } from "../types";
import { createDesignRuntimeScript, injectDesignRuntimeIntoHtml } from "../designRuntime";
import { instrumentHtmlForDesign } from "../designWriteback";

/**
 * iframe에서 서빙할 HTML을 준비한다.
 * - instrumentHtmlForDesign: 요소를 코드로 되돌려 쓰기 위한 data-codee-id 앵커를 심는다.
 * - injectDesignRuntimeIntoHtml: 선택/실시간 스타일 적용용 런타임 스크립트를 주입한다.
 * (사용자가 편집기에서 보는 원본 소스에는 절대 적용하지 않는다 — 서빙 사본에만 적용)
 */
export function prepareServedHtml(source: string, instrument: boolean): string {
  return injectDesignRuntimeIntoHtml(instrument ? instrumentHtmlForDesign(source) : source);
}

export function withDesignRuntimeFiles(
  files: Record<string, LoadedFile>,
  workspaceRoot?: string,
): Record<string, LoadedFile> {
  const isStatic = workspaceRoot === undefined;
  const normalizedRoot = workspaceRoot ? workspaceRoot.replace(/\/+$/, "") : "";
  const prefix = normalizedRoot ? `${normalizedRoot}/` : "";
  const runtimePath = normalizedRoot
    ? `${prefix}public/codee-design-runtime.js`
    : "codee-design-runtime.js";
  const indexPath = `${prefix}index.html`;
  const nextFiles: Record<string, LoadedFile> = {
    ...files,
    [runtimePath]: {
      path: runtimePath,
      content: createDesignRuntimeScript(),
      dirty: false,
    },
  };

  const indexFile = nextFiles[indexPath];
  if (indexFile && indexFile.encoding !== "base64") {
    nextFiles[indexPath] = {
      ...indexFile,
      content: prepareServedHtml(indexFile.content, isStatic),
    };
  }

  return nextFiles;
}
