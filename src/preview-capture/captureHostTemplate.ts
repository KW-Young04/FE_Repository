export const CAPTURE_HOST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview Capture Host</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      overflow: hidden;
    }
    #preview-target {
      border: 0;
      display: block;
      width: 1280px;
      height: 720px;
    }
  </style>
</head>
<body>
  <iframe
    id="preview-target"
    title="preview-target"
    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
  ></iframe>
  <script>
(function () {
  // No query params — WebContainer often cannot navigate to ?parentOrigin=... URLs.
  // Used as hash-takeover host for CRA/Vite SPA (see buildCaptureHostBootScript).
  var allowedParentOrigin = null;
  var defaultWaitMs = 1500;
  var frame = document.getElementById("preview-target");
  var capturing = false;
  var readyNotified = false;
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
    if (window.html2canvas) return;
    var candidates = [
      "/__cursor__/html2canvas.min.js",
      "/html2canvas.min.js",
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
    if (!rootDoc) return;
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
    if (!doc) return null;
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
    if (!doc) return false;
    return Boolean(
      doc.querySelector("vite-error-overlay") ||
        doc.getElementById("webpack-dev-server-client-overlay") ||
        doc.getElementById("webpack-dev-server-client-overlay-div")
    );
  }

  function loadPreview(targetPath) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("Preview iframe load timeout"));
      }, 30000);

      function onLoad() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        frame.removeEventListener("load", onLoad);
        resolve();
      }

      frame.addEventListener("load", onLoad);
      var nextSrc = targetPath && targetPath.charAt(0) === "/" ? targetPath : "/" + (targetPath || "");
      // Strip hash so nested React app does not re-enter capture-host boot.
      if (nextSrc.indexOf("#") >= 0) {
        nextSrc = nextSrc.split("#")[0] || "/";
      }
      // Force reload even if same path.
      frame.src = "about:blank";
      window.setTimeout(function () {
        frame.src = nextSrc;
      }, 0);
    });
  }

  async function waitForPreviewReact(doc, maxMs) {
    var started = Date.now();
    var stableHits = 0;
    var lastChildCount = -1;

    while (Date.now() - started < maxMs) {
      if (hasDevErrorOverlay(doc)) {
        throw new Error("Nested preview shows a Vite/Webpack error overlay");
      }

      var root = findReactMount(doc);
      if (root && isMeaningfulMount(root)) {
        var count = root.children ? root.children.length : 0;
        if (count === lastChildCount) {
          stableHits += 1;
        } else {
          stableHits = 0;
          lastChildCount = count;
        }
        if (stableHits >= 2) {
          postStatus("preview_react_ready", {
            elapsedMs: Date.now() - started,
            childCount: count,
          });
          return;
        }
      } else if (!root && doc.body && doc.body.children.length > 1) {
        postStatus("preview_body_ready", { elapsedMs: Date.now() - started });
        return;
      }

      await wait(250);
    }

    postStatus("preview_react_wait_timeout", { maxMs: maxMs });
  }

  async function captureFrame(requestId, waitMs, targetPath) {
    postStatus("capture_start", { requestId: requestId, targetPath: targetPath });
    await ensureHtml2Canvas();
    postStatus("html2canvas_ready");

    await loadPreview(targetPath || "/");
    postStatus("preview_loaded");

    var doc = frame.contentDocument;
    if (!doc || !doc.documentElement) {
      throw new Error("Preview document is not available (cross-origin or not loaded)");
    }

    stripFontResources(doc);
    await waitForPreviewReact(doc, Math.max(waitMs * 3, 15000));
    await wait(waitMs);

    var canvas = await withTimeout(
      window.html2canvas(doc.documentElement, {
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
    var targetPath = typeof data.targetPath === "string" ? data.targetPath : "/";
    capturing = true;
    postStatus("request_received", { requestId: requestId, targetPath: targetPath });

    captureFrame(requestId, waitMs, targetPath)
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
    postToParent({ type: "CURSOR_PREVIEW_CAPTURE_READY" });
    if (!readyNotified) {
      readyNotified = true;
      postStatus("ready", { href: String(window.location.href || "") });
    }
  }

  // Host page itself is ready immediately — do not wait for preview iframe.
  notifyReady();
  window.setTimeout(notifyReady, 500);
  window.setTimeout(notifyReady, 1500);
  window.setTimeout(notifyReady, 3000);
})();
  </script>
</body>
</html>`;
