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
  var params = new URLSearchParams(window.location.search);
  var parentOrigin = params.get("parentOrigin");
  var targetPath = params.get("target") || "/";
  var defaultWaitMs = Number(params.get("waitMs") || "1500");
  var frame = document.getElementById("preview-target");
  var hostReady = false;

  if (!parentOrigin) {
    console.error("[capture-host] parentOrigin is required");
    return;
  }

  function postToParent(payload) {
    window.parent.postMessage(payload, parentOrigin);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Failed to load script: " + src));
      };
      document.head.appendChild(script);
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      wait(ms).then(function () {
        throw new Error(message);
      }),
    ]);
  }

  function isAbsoluteHttpUrl(url) {
    return url.indexOf("http://") === 0 || url.indexOf("https://") === 0;
  }

  function sanitizeCloneDocument(clonedDoc) {
    if (!clonedDoc) return;

    var links = clonedDoc.querySelectorAll('link[rel="stylesheet"], link[as="style"]');
    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (
        href.indexOf("fonts.googleapis.com") >= 0 ||
        href.indexOf("fonts.gstatic.com") >= 0 ||
        isAbsoluteHttpUrl(href)
      ) {
        link.remove();
      }
    });

    var images = clonedDoc.querySelectorAll("img");
    images.forEach(function (img) {
      var src = img.getAttribute("src") || "";
      if (isAbsoluteHttpUrl(src) && src.indexOf(location.origin) !== 0) {
        img.setAttribute("crossorigin", "anonymous");
      }
    });
  }

  async function captureFrame(requestId, waitMs) {
    if (!window.html2canvas) {
      throw new Error("html2canvas is not available");
    }

    await wait(waitMs);

    var doc = frame.contentDocument;
    if (!doc || !doc.documentElement) {
      throw new Error("Preview document is not available (cross-origin or not loaded)");
    }

    if (doc.fonts && doc.fonts.ready) {
      try {
        await withTimeout(doc.fonts.ready, 2000, "font ready timeout");
      } catch (_error) {
        // External fonts (e.g. Google Fonts) often fail under WebContainer COEP.
      }
    }

    await new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(resolve);
      });
    });

    var canvas = await window.html2canvas(doc.documentElement, {
      width: 1280,
      height: 720,
      windowWidth: 1280,
      windowHeight: 720,
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale: 1,
      backgroundColor: "#ffffff",
      onclone: function (_document, element) {
        var clonedDoc = element && element.ownerDocument ? element.ownerDocument : null;
        sanitizeCloneDocument(clonedDoc);
      },
    });

    var dataUrl;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch (error) {
      throw new Error(
        "Canvas export failed (likely tainted by external resources): " +
          (error && error.message ? error.message : String(error))
      );
    }

    var base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
    if (!base64) {
      throw new Error("Captured image is empty");
    }

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
    if (event.origin !== parentOrigin) return;

    var data = event.data;
    if (!data || data.type !== "CURSOR_PREVIEW_CAPTURE_REQUEST") return;

    var requestId = data.requestId;
    var waitMs = typeof data.waitMs === "number" ? data.waitMs : defaultWaitMs;

    captureFrame(requestId, waitMs)
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
      });
  });

  async function boot() {
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");

      frame.addEventListener("load", function () {
        if (hostReady) return;
        hostReady = true;
        postToParent({ type: "CURSOR_PREVIEW_CAPTURE_READY" });
      });

      frame.src = targetPath.startsWith("/") ? targetPath : "/" + targetPath;
    } catch (error) {
      postToParent({
        type: "CURSOR_PREVIEW_CAPTURE_ERROR",
        requestId: null,
        ok: false,
        code: "BOOT_FAILED",
        message: error && error.message ? error.message : String(error),
      });
    }
  }

  boot();
})();
  </script>
</body>
</html>`;
