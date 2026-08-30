export function createDesignRuntimeScript(): string {
  return String.raw`
(() => {
  const SOURCE = "codee-design-runtime";
  const PANEL_SOURCE = "codee-design-panel";
  let selected = null;
  let selectedId = 0;
  const issueOverlays = [];

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;display:none;pointer-events:none;z-index:2147483647;border:2px solid #7c3aed;box-shadow:0 0 0 1px rgba(255,255,255,.9);box-sizing:border-box;";
  document.documentElement.appendChild(overlay);

  function removeIssueOverlays() {
    while (issueOverlays.length) {
      const item = issueOverlays.pop();
      if (item && item.parentElement) item.parentElement.removeChild(item);
    }
  }

  function createIssueOverlay(rect, issue, index) {
    const box = document.createElement("div");
    box.__codeeIssue = issue;
    box.setAttribute("data-codee-issue-overlay", "1");
    box.style.cssText = [
      "position:fixed",
      "left:" + rect.left + "px",
      "top:" + rect.top + "px",
      "width:" + rect.width + "px",
      "height:" + rect.height + "px",
      "pointer-events:none",
      "z-index:2147483646",
      "border:2px solid #ff2d20",
      "border-radius:8px",
      "box-shadow:0 0 0 9999px rgba(255,45,32,0.02),0 0 0 1px rgba(255,255,255,.95)",
      "box-sizing:border-box",
    ].join(";");

    const label = document.createElement("div");
    label.setAttribute("data-codee-issue-label", "1");
    label.textContent = issue.code || String(index + 1);
    label.style.cssText = [
      "position:absolute",
      "left:16px",
      "top:-20px",
      "height:20px",
      "min-width:58px",
      "padding:0 8px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "border-radius:4px 4px 0 0",
      "background:#ff2d20",
      "color:#fff",
      "font:700 10px/1 Arial,Helvetica,sans-serif",
      "white-space:nowrap",
      "box-sizing:border-box",
    ].join(";");
    box.appendChild(label);
    document.documentElement.appendChild(box);
    issueOverlays.push(box);
  }

  function highlightIssues(issues) {
    removeIssueOverlays();
    if (!Array.isArray(issues)) return;

    issues.slice(0, 20).forEach((issue, index) => {
      if (!issue || !issue.selector) return;
      let target = null;
      try {
        target = document.querySelector(issue.selector);
      } catch (error) {
        return;
      }
      if (!(target instanceof HTMLElement)) return;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      createIssueOverlay(rect, issue, index);
    });
  }

  function toHex(color, fallback) {
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return fallback;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
    return "#" + [match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("");
  }

  function colorAlpha(color, fallback) {
    if (!color) return fallback;
    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (!match) return fallback;
    const parts = match[1].split(",").map((part) => part.trim());
    if (parts.length >= 4) return Math.round(parseFloat(parts[3]) * 100);
    return 100;
  }

  function getSelector(element) {
    if (element.id) return "#" + element.id;
    const parts = [];
    let current = element;
    while (current && current.nodeType === 1 && current !== document.body && parts.length < 4) {
      let name = current.tagName.toLowerCase();
      if (current.classList.length) name += "." + Array.from(current.classList).slice(0, 2).join(".");
      parts.unshift(name);
      current = current.parentElement;
    }
    return parts.join(" > ") || element.tagName.toLowerCase();
  }

  function readTransform(style) {
    const result = { rotation: 0, flipH: false, flipV: false, x: 0, y: 0 };
    const transform = style.transform;
    if (!transform || transform === "none") return result;
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (!match) return result;
    const values = match[1].split(",").map(Number);
    const a = values[0], b = values[1], c = values[2], d = values[3], e = values[4], f = values[5];
    result.rotation = Math.round((Math.atan2(b, a) * 180) / Math.PI);
    if (a * d - b * c < 0) result.flipH = true;
    // translate 를 항상 맨 앞에 넣으므로 matrix 의 e,f 가 곧 이동량(px)이다.
    result.x = Number.isFinite(e) ? Math.round(e) : 0;
    result.y = Number.isFinite(f) ? Math.round(f) : 0;
    return result;
  }

  function readEffect(style) {
    const boxShadow = style.boxShadow || "none";
    const filter = style.filter || "none";
    if (filter.indexOf("blur") !== -1) return { dropShadow: true, effectType: "layer-blur" };
    if (boxShadow !== "none") return { dropShadow: true, effectType: boxShadow.indexOf("inset") !== -1 ? "inner-shadow" : "drop-shadow" };
    return { dropShadow: false, effectType: "drop-shadow" };
  }

  function isTransparent(color) {
    return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)";
  }

  function readValues(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const transform = readTransform(style);
    const effect = readEffect(style);
    // 배경/테두리가 아예 없는 요소는 computed 값이 투명(rgba(...,0))으로 잡혀
    // 불투명도를 0으로 읽으면 새로 칠한 색이 투명하게 적용되어 "안 먹는" 것처럼 보인다.
    // 따라서 투명한 경우에는 기본 불투명도를 100으로 둔다.
    const bgTransparent = isTransparent(style.backgroundColor);
    const borderTransparent = isTransparent(style.borderColor);
    return {
      position: style.position || "static",
      alignment: style.textAlign || "left",
      x: transform.x,
      y: transform.y,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      rotation: transform.rotation,
      flipH: transform.flipH,
      flipV: transform.flipV,
      opacity: Math.round(Number(style.opacity || "1") * 100),
      borderRadius: parseInt(style.borderRadius, 10) || 0,
      textColor: toHex(style.color, "#000000"),
      textColorOpacity: isTransparent(style.color) ? 100 : colorAlpha(style.color, 100),
      backgroundColor: toHex(style.backgroundColor, "#ffffff"),
      fillOpacity: bgTransparent ? 100 : colorAlpha(style.backgroundColor, 100),
      borderColor: toHex(style.borderColor, "#000000"),
      strokeOpacity: borderTransparent ? 100 : colorAlpha(style.borderColor, 100),
      borderWidth: parseInt(style.borderWidth, 10) || 0,
      dropShadow: effect.dropShadow,
      effectType: effect.effectType,
      effectOpacity: 100,
    };
  }

  function updateOverlay() {
    if (!selected || !document.documentElement.contains(selected)) {
      overlay.style.display = "none";
      return;
    }
    const rect = selected.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
  }

  function selectElement(element) {
    selected = element;
    selectedId += 1;
    updateOverlay();
    const rawSourceId = element.getAttribute("data-codee-id");
    window.parent.postMessage({
      source: SOURCE,
      type: "selected",
      payload: {
        id: String(selectedId),
        sourceId: rawSourceId == null ? null : Number(rawSourceId),
        selector: getSelector(element),
        tagName: element.tagName,
        className: typeof element.className === "string" ? element.className : "",
        idName: element.id || "",
        values: readValues(element),
      },
    }, "*");
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target === document.documentElement || target === document.body) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(target);
  }, true);

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== PANEL_SOURCE) return;
    if (data.type === "highlight-issues") {
      highlightIssues(data.payload && data.payload.issues);
      return;
    }
    if (data.type !== "apply-css" || !selected) return;
    const css = (data.payload && data.payload.css) || {};
    for (const property in css) {
      if (!Object.prototype.hasOwnProperty.call(css, property)) continue;
      selected.style.setProperty(property, css[property]);
    }
    updateOverlay();
  });

  window.addEventListener("scroll", updateOverlay, true);
  window.addEventListener("scroll", function () {
    const issues = issueOverlays.map(function (item) {
      return item.__codeeIssue;
    }).filter(Boolean);
    highlightIssues(issues);
  }, true);
  window.addEventListener("resize", function () {
    updateOverlay();
    const issues = issueOverlays.map(function (item) {
      return item.__codeeIssue;
    }).filter(Boolean);
    highlightIssues(issues);
  });
  window.parent.postMessage({ source: SOURCE, type: "ready" }, "*");
})();`;
}

export function injectDesignRuntimeIntoHtml(html: string): string {
  const script = '<script src="/codee-design-runtime.js?v=issue-highlight-1"></script>';
  const existingRuntimePattern =
    /<script\b[^>]*\bsrc=["']\/codee-design-runtime\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/i;
  if (existingRuntimePattern.test(html)) {
    return html.replace(existingRuntimePattern, script);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }
  return `${html}${script}`;
}
