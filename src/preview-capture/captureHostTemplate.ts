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
  <iframe id="preview-target" title="preview-target"></iframe>
  <script>
(function () {
  // No query params — WebContainer often cannot navigate to ?parentOrigin=... URLs.
  var allowedParentOrigin = null;
  var defaultWaitMs = 1500;
  var frame = document.getElementById("preview-target");
  var capturing = false;
  var readyNotified = false;

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

  function loadPreview(targetPath) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("Preview iframe load timeout"));
      }, 20000);

      function onLoad() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        frame.removeEventListener("load", onLoad);
        resolve();
      }

      frame.addEventListener("load", onLoad);
      var nextSrc = targetPath && targetPath.charAt(0) === "/" ? targetPath : "/" + (targetPath || "");
      // Force reload even if same path.
      frame.src = "about:blank";
      window.setTimeout(function () {
        frame.src = nextSrc;
      }, 0);
    });
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
