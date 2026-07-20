/**
 * Boot script injected at the start of <head>.
 * When the preview URL hash is #__cursor_capture_host, it replaces the document
 * with our capture-host page. This avoids CRA/Vite SPA fallback swallowing
 * /__cursor__/capture-host.html as index.html (which caused sawReady=false).
 */
export function buildCaptureHostBootScript(captureHostHtml: string): string {
  // Prevent </script> in the HTML string from terminating the surrounding <script> tag.
  const htmlLiteral = JSON.stringify(captureHostHtml).replace(/</g, "\\u003c");
  return `(function(){if(String(location.hash||"").indexOf("__cursor_capture_host")===-1)return;var html=${htmlLiteral};try{document.open();document.write(html);document.close();}catch(e){console.error("[capture-host-boot]",e);}})();`;
}
