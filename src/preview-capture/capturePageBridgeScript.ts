/**
 * Injected into preview HTML.
 * Works without query params (WebContainer often cannot navigate to ?__cursor_capture=... URLs).
 * Parent origin is learned from the first CAPTURE_REQUEST message.
 * html2canvas must be same-origin (COEP blocks CDN scripts in WebContainer).
 *
 * React / CRA / Vite: waits for mount roots (#root, #app, #__next, …) to paint
 * before running html2canvas so SPA shells are not captured empty.
 */
export const CAPTURE_PAGE_BRIDGE_SCRIPT = `(function () {
  if (window.__CURSOR_CAPTURE_BRIDGE__) return;
  window.__CURSOR_CAPTURE_BRIDGE__ = true;

  var allowedParentOrigin = null;
  var defaultWaitMs = 800;
  var readyNotified = false;
  var capturing = false;
  var REACT_ROOT_SELECTORS = [
    "#root",
    "#app",
    "#__next",
    "#__nuxt",
    "[data-reactroot]",
    "[data-react-root]",
    "#main",
    "main",
  ];

  try {
    var params = new URLSearchParams(window.location.search || "");
    if (params.get("parentOrigin")) allowedParentOrigin = params.get("parentOrigin");
    if (params.get("waitMs")) defaultWaitMs = Number(params.get("waitMs")) || defaultWaitMs;
  } catch (_error) {}

  function postToParent(payload) {
    try {
      window.parent.postMessage(payload, allowedParentOrigin || "*");
    } catch (_error) {}
  }

  function postStatus(stage, detail) {
    postToParent({
      type: "CURSOR_PREVIEW_CAPTURE_STATUS",
      stage: stage,
      detail: detail || null,
      href: String(window.location.href || ""),
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function withTimeout(promise, ms, message) {
    var timeoutId;
    var timeoutPromise = new Promise(function (_, reject) {
      timeoutId = window.setTimeout(function () {
        reject(new Error(message));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(function () {
      window.clearTimeout(timeoutId);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.html2canvas) {
        resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      var done = false;
      var timer = window.setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("Script load timeout: " + src));
      }, 8000);
      script.onload = function () {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        // CRA SPA fallback can return index.html with 200 — onload fires but no API.
        if (!window.html2canvas) {
          reject(new Error("Script loaded but html2canvas missing (SPA fallback?): " + src));
          return;
        }
        resolve();
      };
      script.onerror = function () {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        reject(new Error("Failed to load " + src));
      };
      document.head.appendChild(script);
    });
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) {
      postStatus("html2canvas_inline");
      return;
    }
    var candidates = [
      "/__cursor__/html2canvas.min.js",
      "/html2canvas.min.js",
      "./__cursor__/html2canvas.min.js",
      "./html2canvas.min.js",
      "html2canvas.min.js",
    ];
    var lastError = null;
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        postStatus("html2canvas_load", candidates[i]);
        await loadScript(candidates[i]);
        if (window.html2canvas) return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("html2canvas unavailable");
  }

  function stripFontResources(rootDoc) {
    var links = rootDoc.querySelectorAll("link");
    links.forEach(function (link) {
      var href = (link.getAttribute("href") || "").toLowerCase();
      if (
        href.indexOf("fonts.googleapis.com") >= 0 ||
        href.indexOf("fonts.gstatic.com") >= 0 ||
        href.indexOf("fonts.adobe.com") >= 0 ||
        href.indexOf("use.typekit.net") >= 0
      ) {
        link.remove();
      }
    });
  }

  function findReactMount(doc) {
    for (var i = 0; i < REACT_ROOT_SELECTORS.length; i += 1) {
      var el = doc.querySelector(REACT_ROOT_SELECTORS[i]);
      if (el) return el;
    }
    return null;
  }

  function isMeaningfulMount(el) {
    if (!el) return false;
    if (el.children && el.children.length > 0) return true;
    var text = (el.innerText || el.textContent || "").trim();
    return text.length > 0;
  }

  function hasDevErrorOverlay(doc) {
    return Boolean(
      doc.querySelector("vite-error-overlay") ||
        doc.getElementById("webpack-dev-server-client-overlay") ||
        doc.getElementById("webpack-dev-server-client-overlay-div") ||
        doc.querySelector("iframe[id^='webpack-dev-server']")
    );
  }

  async function waitForAppContent(maxMs) {
    var started = Date.now();
    var sawMount = false;
    var stableHits = 0;
    var lastChildCount = -1;

    while (Date.now() - started < maxMs) {
      if (hasDevErrorOverlay(document)) {
        throw new Error("Dev server error overlay is visible — React/Vite 빌드 오류를 확인하세요.");
      }

      var root = findReactMount(document);
      if (root && isMeaningfulMount(root)) {
        sawMount = true;
        var count = root.children ? root.children.length : 0;
        if (count === lastChildCount) {
          stableHits += 1;
        } else {
          stableHits = 0;
          lastChildCount = count;
        }
        // React 18 Strict Mode / concurrent: require a short stability window.
        if (stableHits >= 2) {
          postStatus("app_ready", {
            elapsedMs: Date.now() - started,
            selector: root.id ? "#" + root.id : root.tagName,
            childCount: count,
          });
          return root;
        }
      } else if (!root && document.body && document.body.children.length > 1) {
        // Non-React / custom mount without #root
        postStatus("app_ready_body", { elapsedMs: Date.now() - started });
        return document.body;
      }

      await wait(250);
    }

    postStatus("app_wait_timeout", { maxMs: maxMs, sawMount: sawMount });
    return findReactMount(document) || document.body || document.documentElement;
  }

  async function waitForAssets() {
    try {
      var styleLinks = Array.prototype.slice.call(
        document.querySelectorAll('link[rel="stylesheet"]')
      );
      await Promise.all(
        styleLinks.map(function (link) {
          if (link.sheet) return Promise.resolve();
          return new Promise(function (resolve) {
            link.addEventListener("load", resolve, { once: true });
            link.addEventListener("error", resolve, { once: true });
            window.setTimeout(resolve, 1500);
          });
        })
      );
    } catch (_error) {}

    try {
      var images = Array.prototype.slice.call(document.images || []);
      await Promise.all(
        images.map(function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (resolve) {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            window.setTimeout(resolve, 1500);
          });
        })
      );
    } catch (_error) {}
  }

  async function captureNow(requestId, waitMs) {
    postStatus("capture_start", { requestId: requestId, waitMs: waitMs });
    stripFontResources(document);
    await ensureHtml2Canvas();
    postStatus("html2canvas_ready");

    await waitForAssets();

    // React SPA: first paint often happens well after DOMContentLoaded.
    var mount = await waitForAppContent(Math.max(waitMs * 3, 15000));
    await wait(waitMs);

    // Prefer capturing the React mount so empty chrome outside #root is minimized,
    // but fall back to body for full-page layouts.
    var target = mount && isMeaningfulMount(mount) ? mount : document.body || document.documentElement;
    if (target === mount && mount !== document.body) {
      // Include body background by capturing documentElement when root is full-bleed.
      var rootRect = mount.getBoundingClientRect();
      if (rootRect.width >= window.innerWidth * 0.9 && rootRect.height >= window.innerHeight * 0.5) {
        target = document.documentElement;
      }
    }

    postStatus("html2canvas_run", {
      target: target && target.id ? "#" + target.id : target ? target.tagName : null,
      bodyChildren: document.body ? document.body.children.length : 0,
    });

    var canvas = await withTimeout(
      window.html2canvas(target, {
        width: 1280,
        height: 720,
        windowWidth: 1280,
        windowHeight: 720,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1,
        backgroundColor: "#ffffff",
        imageTimeout: 1500,
        removeContainer: true,
        onclone: function (clonedDoc) {
          stripFontResources(clonedDoc);
          var overlay = clonedDoc.querySelector("vite-error-overlay");
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        },
      }),
      12000,
      "html2canvas timed out"
    );

    var dataUrl = canvas.toDataURL("image/png");
    var base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
    if (!base64) throw new Error("Captured image is empty");

    postStatus("capture_done", { width: canvas.width, height: canvas.height });
    return {
      type: "CURSOR_PREVIEW_CAPTURE_RESULT",
      requestId: requestId,
      ok: true,
      width: canvas.width,
      height: canvas.height,
      mimeType: "image/png",
      base64: base64,
    };
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "CURSOR_PREVIEW_CAPTURE_REQUEST") return;

    if (!allowedParentOrigin) {
      allowedParentOrigin = event.origin;
    } else if (event.origin !== allowedParentOrigin) {
      return;
    }

    if (capturing) {
      postStatus("capture_busy");
      return;
    }

    var requestId = data.requestId;
    var waitMs = typeof data.waitMs === "number" ? data.waitMs : defaultWaitMs;
    capturing = true;
    postStatus("request_received", { requestId: requestId });

    captureNow(requestId, waitMs)
      .then(function (result) {
        postToParent(result);
      })
      .catch(function (error) {
        postToParent({
          type: "CURSOR_PREVIEW_CAPTURE_ERROR",
          requestId: requestId,
          ok: false,
          code: "RENDER_FAILED",
          message: error && error.message ? error.message : String(error),
        });
      })
      .finally(function () {
        capturing = false;
      });
  });

  function notifyReady() {
    stripFontResources(document);
    postToParent({ type: "CURSOR_PREVIEW_CAPTURE_READY" });
    if (!readyNotified) {
      readyNotified = true;
      postStatus("ready");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady, { once: true });
  } else {
    notifyReady();
  }

  // Parent may attach late; React hydrate may finish later — re-announce readiness.
  window.setTimeout(notifyReady, 500);
  window.setTimeout(notifyReady, 1500);
  window.setTimeout(notifyReady, 3000);
  window.setTimeout(notifyReady, 6000);
  window.setTimeout(notifyReady, 10000);
})();`;
