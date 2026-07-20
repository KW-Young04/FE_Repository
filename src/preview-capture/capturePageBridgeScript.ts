/**
 * Injected into preview HTML.
 * Works without query params (WebContainer often cannot navigate to ?__cursor_capture=... URLs).
 * Parent origin is learned from the first CAPTURE_REQUEST message.
 * html2canvas must be same-origin (COEP blocks CDN scripts in WebContainer).
 */
export const CAPTURE_PAGE_BRIDGE_SCRIPT = `(function () {
  if (window.__CURSOR_CAPTURE_BRIDGE__) return;
  window.__CURSOR_CAPTURE_BRIDGE__ = true;

  var allowedParentOrigin = null;
  var defaultWaitMs = 800;
  var readyNotified = false;
  var capturing = false;

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

  async function waitForAppContent(maxMs) {
    var started = Date.now();
    while (Date.now() - started < maxMs) {
      var root = document.getElementById("root") || document.getElementById("app") || document.getElementById("__next");
      if (root && root.children && root.children.length > 0) {
        postStatus("app_ready", { elapsedMs: Date.now() - started });
        return;
      }
      if (!root && document.body && document.body.children.length > 1) {
        postStatus("app_ready_body", { elapsedMs: Date.now() - started });
        return;
      }
      await wait(250);
    }
    postStatus("app_wait_timeout", { maxMs: maxMs });
  }

  async function captureNow(requestId, waitMs) {
    postStatus("capture_start", { requestId: requestId, waitMs: waitMs });
    stripFontResources(document);
    await ensureHtml2Canvas();
    postStatus("html2canvas_ready");

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

    await waitForAppContent(Math.max(waitMs * 2, 12000));
    await wait(waitMs);

    var target = document.body || document.documentElement;
    postStatus("html2canvas_run", {
      bodyChildren: target ? target.children.length : 0,
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

  // Parent may attach late; re-announce readiness a few times.
  window.setTimeout(notifyReady, 500);
  window.setTimeout(notifyReady, 1500);
  window.setTimeout(notifyReady, 3000);
  window.setTimeout(notifyReady, 6000);
})();`;
