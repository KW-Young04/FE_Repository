import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
const profile = await mkdtemp(path.join(tmpdir(), "codee-smoke-"));
const browser = spawn(
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
  let tabs;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split(
        "\n",
      )[0];
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (tabs.length) break;
    } catch {
      /* browser starts asynchronously */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!tabs?.length) throw new Error("Headless Chrome did not start");
  socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(message.error);
      else task.resolve(message.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const nextId = ++id;
      pending.set(nextId, { resolve, reject });
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [1180, 600],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: `${origin}/tests/workspace-smoke.html?size=${width}` });
    let result;
    for (let attempt = 0; attempt < 180; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const response = await send("Runtime.evaluate", {
        expression: "window.__smokeResult",
        returnByValue: true,
      });
      result = response.result?.value;
      if (result) break;
    }
    if (!result) throw new Error(`Browser tests timed out at ${width}x${height}`);
    console.log(
      JSON.stringify(
        { viewport: `${width}x${height}`, checks: result.passed.length, ...result },
        null,
        2,
      ),
    );
    if (result.error) {
      process.exitCode = 1;
      break;
    }
  }
} finally {
  socket?.close();
  browser.kill();
  await server.close();
  // Only remove the unique temporary profile created by this run.
  if (
    path.dirname(profile) === path.resolve(tmpdir()) &&
    path.basename(profile).startsWith("codee-smoke-")
  ) {
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
