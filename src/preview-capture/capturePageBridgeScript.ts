/**
 * Injected into preview HTML when ?__cursor_capture=1 is present.
 * Runs inside the preview page (same origin) and posts PNG back to the parent.
 */
export const CAPTURE_PAGE_BRIDGE_SCRIPT = `(function () {
  if (window.__CURSOR_CAPTURE_BRIDGE__) return;
  window.__CURSOR_CAPTURE_BRIDGE__ = true;

  var params = new URLSearchParams(window.location.search);
  var parentOrigin = params.get("parentOrigin");
  var defaultWaitMs = Number(params.get("waitMs") || "500");

  if (!parentOrigin) {
    console.error("[capture-bridge] parentOrigin is required");
    return;
  }

  function postToParent(payload) {
    window.parent.postMessage(payload, parentOrigin);
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
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(script);
    });
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

  async function captureNow(requestId, waitMs) {
    stripFontResources(document);
    await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");

    // Wait for stylesheets/images so the snapshot is not an unstyled DOM dump.
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
            window.setTimeout(resolve, 2000);
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
            window.setTimeout(resolve, 2000);
          });
        })
      );
    } catch (_error) {}

    await wait(waitMs);

    var target = document.body || document.documentElement;
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
      8000,
      "html2canvas timed out"
    );

    var dataUrl = canvas.toDataURL("image/png");
    var base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
    if (!base64) throw new Error("Captured image is empty");

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

  var capturing = false;

  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.type !== "CURSOR_PREVIEW_CAPTURE_REQUEST") return;
    if (capturing) return;

    var requestId = data.requestId;
    var waitMs = typeof data.waitMs === "number" ? data.waitMs : defaultWaitMs;
    capturing = true;

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

  // IMPORTANT: do NOT wait for window "load".
  // External fonts (Google Fonts) often hang under WebContainer COEP and delay load forever.
  function notifyReady() {
    stripFontResources(document);
    postToParent({ type: "CURSOR_PREVIEW_CAPTURE_READY" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady, { once: true });
  } else {
    notifyReady();
  }
})();`;
