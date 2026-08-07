/**
 * 디자인 도구의 변경 사항을 실제 소스 코드(HTML)로 되돌려 쓰기 위한 유틸리티.
 *
 * 매핑 전략:
 *  - 서빙되는 HTML(iframe에서 실행되는 사본)의 모든 여는 태그에 문서 순서대로
 *    `data-codee-id="N"` 을 심는다. 사용자가 편집기(Monaco)에서 보는 원본 소스에는
 *    아무 것도 심지 않아 코드가 깨끗하게 유지된다.
 *  - 런타임은 선택한 요소의 `data-codee-id` 를 읽어 부모(앱)로 알려준다.
 *  - 되돌려 쓸 때는 "깨끗한 원본"을 동일한 스캐너로 다시 훑어 N번째 태그를 찾는다.
 *    스타일 속성만 추가/수정될 뿐 태그의 개수·순서는 변하지 않으므로 N 은 안정적이다.
 */

interface OpenTag {
  index: number;
  /** 소스에서 '<' 위치 */
  tagStart: number;
  /** 여는 태그 '>' 바로 다음 위치 */
  tagEnd: number;
  name: string;
  /** 태그명 바로 뒤(속성 삽입 지점)의 소스 오프셋 */
  attrsStart: number;
}

const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);

/** 여는 태그를 문서 순서대로 수집한다. 주석/선언/닫는 태그/원시 텍스트 내부는 건너뛴다. */
function scanOpenTags(source: string): OpenTag[] {
  const tags: OpenTag[] = [];
  const length = source.length;
  let cursor = 0;
  let counter = 0;

  while (cursor < length) {
    const lt = source.indexOf("<", cursor);
    if (lt === -1) break;

    if (source.startsWith("<!--", lt)) {
      const end = source.indexOf("-->", lt + 4);
      cursor = end === -1 ? length : end + 3;
      continue;
    }
    if (source.startsWith("<!", lt) || source.startsWith("<?", lt)) {
      const end = source.indexOf(">", lt + 2);
      cursor = end === -1 ? length : end + 1;
      continue;
    }
    if (source[lt + 1] === "/") {
      const end = source.indexOf(">", lt + 2);
      cursor = end === -1 ? length : end + 1;
      continue;
    }

    const nameMatch = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(source.slice(lt + 1, lt + 41));
    if (!nameMatch) {
      cursor = lt + 1;
      continue;
    }

    const name = nameMatch[0];
    const attrsStart = lt + 1 + name.length;

    // 따옴표를 존중하며 여는 태그의 끝('>')을 찾는다.
    let scan = attrsStart;
    let quote: string | null = null;
    while (scan < length) {
      const ch = source[scan];
      if (quote) {
        if (ch === quote) quote = null;
        scan += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        scan += 1;
        continue;
      }
      if (ch === ">") break;
      scan += 1;
    }
    if (scan >= length) break;

    const tagEnd = scan + 1;
    tags.push({ index: counter, tagStart: lt, tagEnd, name, attrsStart });
    counter += 1;

    // script/style/textarea/title 의 내부 텍스트는 태그로 오인하지 않도록 통째로 건너뛴다.
    // (HTML 규칙상 원시 텍스트 요소는 첫 번째 `</태그명` 에서 종료되므로 경계 없이 탐색해도 정확하다.)
    const lower = name.toLowerCase();
    if (RAW_TEXT_ELEMENTS.has(lower)) {
      const closeIndex = source.slice(tagEnd).toLowerCase().indexOf(`</${lower}`);
      cursor = closeIndex === -1 ? length : tagEnd + closeIndex;
    } else {
      cursor = tagEnd;
    }
  }

  return tags;
}

/** 서빙용 HTML의 모든 여는 태그에 `data-codee-id` 를 문서 순서대로 심는다. */
export function instrumentHtmlForDesign(source: string): string {
  if (!source || source.indexOf("<") === -1) return source;
  const tags = scanOpenTags(source);
  if (tags.length === 0) return source;

  let result = "";
  let last = 0;
  for (const tag of tags) {
    result += source.slice(last, tag.attrsStart) + ` data-codee-id="${tag.index}"`;
    last = tag.attrsStart;
  }
  result += source.slice(last);
  return result;
}

function parseStyleDeclarations(styleValue: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of styleValue.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (property) declarations.set(property, value);
  }
  return declarations;
}

function serializeStyleDeclarations(declarations: Map<string, string>): string {
  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

/**
 * `sourceId` 로 식별되는 요소의 인라인 style 에 css 를 병합한 새 소스를 돌려준다.
 * 대상을 찾지 못하거나 변화가 없으면 null.
 */
export function applyInlineStyleToSource(
  source: string,
  sourceId: number | null,
  css: Record<string, string>,
): string | null {
  if (sourceId == null || !Number.isFinite(sourceId)) return null;
  if (Object.keys(css).length === 0) return null;

  const tags = scanOpenTags(source);
  const tag = tags[sourceId];
  if (!tag || tag.index !== sourceId) return null;

  const openTag = source.slice(tag.tagStart, tag.tagEnd);
  const styleMatch = /(\sstyle\s*=\s*)("([^"]*)"|'([^']*)')/i.exec(openTag);

  const declarations = styleMatch ? parseStyleDeclarations(styleMatch[3] ?? styleMatch[4] ?? "") : new Map<string, string>();
  for (const [property, value] of Object.entries(css)) {
    if (value === "") {
      declarations.delete(property.toLowerCase());
    } else {
      declarations.set(property.toLowerCase(), value);
    }
  }

  const serialized = serializeStyleDeclarations(declarations);

  let newOpenTag: string;
  if (styleMatch) {
    const usesDoubleQuote = styleMatch[3] != null;
    const quote = usesDoubleQuote ? '"' : "'";
    const replacement = `${styleMatch[1]}${quote}${serialized}${quote}`;
    newOpenTag = openTag.slice(0, styleMatch.index) + replacement + openTag.slice(styleMatch.index + styleMatch[0].length);
  } else {
    const relativeInsert = tag.attrsStart - tag.tagStart;
    newOpenTag = `${openTag.slice(0, relativeInsert)} style="${serialized}"${openTag.slice(relativeInsert)}`;
  }

  if (newOpenTag === openTag) return null;
  return source.slice(0, tag.tagStart) + newOpenTag + source.slice(tag.tagEnd);
}
