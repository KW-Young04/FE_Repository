import { PREVIEW_PORT } from "./constants";

export type PreviewRuntimeKind = "static" | "bundler";

export interface PreviewProjectProfile {
  kind: PreviewRuntimeKind;
  label: string;
  workspaceRoot: string;
  installCommands: string[][];
  devCommand: string[];
  devCommandFallbacks: string[][];
  devEnv: Record<string, string>;
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | Record<string, string[]>;
}

interface FileContentLookup {
  readonly [path: string]: { content: string };
}

function readPackageJson(content: string): PackageJson | null {
  try {
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

function mergeDeps(pkg: PackageJson): Record<string, string> {
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

function isMonorepoRoot(files: FileContentLookup, pkg: PackageJson): boolean {
  return Boolean(
    pkg.workspaces ||
      files["pnpm-workspace.yaml"] ||
      files["pnpm-workspace.yml"] ||
      files["lerna.json"] ||
      files["turbo.json"],
  );
}

function hasTailwind(deps: Record<string, string>): boolean {
  return Boolean(deps.tailwindcss || deps["@tailwindcss/vite"] || deps["@tailwindcss/postcss"]);
}

function buildFrameworkLabel(deps: Record<string, string>): string {
  const parts: string[] = [];

  if (deps.vite || deps["@vitejs/plugin-react"] || deps["@vitejs/plugin-vue"] || deps["@tailwindcss/vite"]) {
    parts.push("Vite");
  } else if (deps.next) {
    parts.push("Next.js");
  } else if (deps["react-scripts"]) {
    parts.push("Create React App");
  } else if (deps.webpack || deps["webpack-dev-server"]) {
    parts.push("Webpack");
  } else if (deps.parcel) {
    parts.push("Parcel");
  }

  if (deps.react) parts.push("React");
  else if (deps.vue) parts.push("Vue");
  else if (deps.svelte) parts.push("Svelte");

  if (hasTailwind(deps)) parts.push("Tailwind CSS");

  return parts.length > 0 ? parts.join(" + ") : "번들러";
}

function packageRequiresPnpm(files: FileContentLookup): boolean {
  if (files["pnpm-lock.yaml"] || files["pnpm-lock.yml"] || files["pnpm-workspace.yaml"] || files["pnpm-workspace.yml"]) {
    return true;
  }

  const root = files["package.json"]?.content;
  if (!root) return false;
  try {
    const pkg = JSON.parse(root) as PackageJson & { scripts?: Record<string, string> };
    const scripts = Object.values(pkg.scripts ?? {}).join("\n");
    return /\bonly-allow\s+pnpm\b/i.test(scripts) || /\bpreinstall\b[\s\S]*\bpnpm\b/i.test(JSON.stringify(pkg.scripts ?? {}));
  } catch {
    return false;
  }
}

function resolveInstallCommands(files: FileContentLookup): string[][] {
  if (packageRequiresPnpm(files) || files["pnpm-lock.yaml"] || files["pnpm-lock.yml"]) {
    return [
      ["pnpm", "install", "--no-frozen-lockfile", "--ignore-scripts", "--config.engine-strict=false"],
      // Fallbacks for environments without pnpm; may still fail if package enforces only-allow pnpm.
      ["npm", "install", "--no-audit", "--no-fund", "--legacy-peer-deps", "--ignore-scripts"],
    ];
  }
  if (files["yarn.lock"]) {
    return [["yarn", "install", "--non-interactive", "--ignore-scripts"]];
  }
  return [["npm", "install", "--no-audit", "--no-fund", "--legacy-peer-deps"]];
}

/** Library / plugin monorepos that are poor WebContainer preview targets. */
export function explainUnsupportedPreviewRepo(files: FileContentLookup): string | null {
  const rootContent = files["package.json"]?.content;
  if (!rootContent) return null;

  const pkg = readPackageJson(rootContent);
  if (!pkg) return null;

  const name = pkg.name ?? "";
  const scripts = Object.values(pkg.scripts ?? {}).join("\n");
  const onlyAllowPnpm = /\bonly-allow\s+pnpm\b/i.test(scripts);
  const playgroundHtmlCount = Object.keys(files).filter((path) =>
    /(?:^|\/)playground\/[^/]+\/index\.html$/i.test(path),
  ).length;
  const hasApps = Object.keys(files).some((path) => path.startsWith("apps/") && path.endsWith("package.json"));
  const looksLikePlugin =
    /plugin|monorepo/i.test(name) ||
    Boolean(pkg.workspaces) ||
    Boolean(files["pnpm-workspace.yaml"] || files["pnpm-workspace.yml"]);

  if (playgroundHtmlCount >= 2 && !hasApps && looksLikePlugin) {
    return (
      "이 저장소는 앱이 아니라 플러그인/라이브러리 모노레포(playground 위주)라서 " +
      "WebContainer에서 의존성 설치·프리뷰가 거의 불가능합니다. " +
      "단일 UI 앱 저장소로 다시 시도해 주세요. 예: mdn/beginner-html-site-styled, ahfarmer/calculator"
    );
  }

  if (onlyAllowPnpm && playgroundHtmlCount >= 2 && !hasApps) {
    return (
      "이 저장소는 pnpm 전용 모노레포이며 프리뷰용 단일 앱 루트가 없습니다. " +
      "단일 UI 앱 저장소를 사용해 주세요."
    );
  }

  return null;
}

function resolveRunCommand(files: FileContentLookup, script: string, extraArgs: string[] = []): string[] {
  if (files["pnpm-lock.yaml"] || files["pnpm-lock.yml"]) {
    return extraArgs.length > 0 ? ["pnpm", "run", script, "--", ...extraArgs] : ["pnpm", "run", script];
  }
  if (files["yarn.lock"]) {
    return extraArgs.length > 0 ? ["yarn", script, ...extraArgs] : ["yarn", script];
  }
  return extraArgs.length > 0 ? ["npm", "run", script, "--", ...extraArgs] : ["npm", "run", script];
}

function resolveNextDevCommands(files: FileContentLookup): string[][] {
  const portArgs = ["--port", String(PREVIEW_PORT), "--hostname", "0.0.0.0"];
  if (files["pnpm-lock.yaml"] || files["pnpm-lock.yml"]) {
    return [
      ["pnpm", "exec", "next", "dev", ...portArgs],
      ["pnpm", "exec", "next", "dev", ...portArgs, "--no-turbopack"],
      ["pnpm", "run", "dev", "--", ...portArgs],
    ];
  }
  if (files["yarn.lock"]) {
    return [["yarn", "next", "dev", ...portArgs]];
  }
  return [
    ["npx", "next", "dev", ...portArgs],
    ["npx", "next", "dev", ...portArgs, "--no-turbopack"],
  ];
}

function resolveDevSpawn(
  files: FileContentLookup,
  pkg: PackageJson,
  deps: Record<string, string>,
): Pick<PreviewProjectProfile, "devCommand" | "devCommandFallbacks" | "devEnv"> | null {
  const baseEnv: Record<string, string> = {
    PORT: String(PREVIEW_PORT),
    HOST: "0.0.0.0",
    HOSTNAME: "0.0.0.0",
    BROWSER: "none",
    CHOKIDAR_USEPOLLING: "true",
  };

  if (deps.vite || deps["@vitejs/plugin-react"] || deps["@vitejs/plugin-vue"] || deps["@tailwindcss/vite"]) {
    const viteFlags = ["--port", String(PREVIEW_PORT), "--host", "0.0.0.0", "--strictPort"];
    if (pkg.scripts?.dev) {
      return {
        devCommand: resolveRunCommand(files, "dev", viteFlags),
        devCommandFallbacks: [],
        devEnv: baseEnv,
      };
    }
    return {
      devCommand: ["npx", "vite", ...viteFlags],
      devCommandFallbacks: [],
      devEnv: baseEnv,
    };
  }

  if (deps.next) {
    const devCommands = resolveNextDevCommands(files);
    return {
      devCommand: devCommands[0],
      devCommandFallbacks: devCommands.slice(1),
      devEnv: baseEnv,
    };
  }

  if (deps["react-scripts"]) {
    return {
      devCommand: resolveRunCommand(files, "start"),
      devCommandFallbacks: [],
      // react-scripts 3/4 + Node 17+ OpenSSL 호환, WebContainer 호스트 바인딩
      devEnv: {
        ...baseEnv,
        NODE_OPTIONS: "--openssl-legacy-provider",
        DANGEROUSLY_DISABLE_HOST_CHECK: "true",
        WDS_SOCKET_PORT: "0",
      },
    };
  }

  if (deps.parcel) {
    return {
      devCommand: ["npx", "parcel", "index.html", "-p", String(PREVIEW_PORT)],
      devCommandFallbacks: [],
      devEnv: baseEnv,
    };
  }

  if (pkg.scripts?.dev) {
    return {
      devCommand: resolveRunCommand(files, "dev"),
      devCommandFallbacks: [],
      devEnv: baseEnv,
    };
  }

  if (pkg.scripts?.start) {
    return {
      devCommand: resolveRunCommand(files, "start"),
      devCommandFallbacks: [],
      devEnv: baseEnv,
    };
  }

  return null;
}

function isBundlerPackage(pkg: PackageJson, deps: Record<string, string>): boolean {
  const hasBundlerTool = Boolean(
    deps.vite ||
      deps["@vitejs/plugin-react"] ||
      deps["@vitejs/plugin-vue"] ||
      deps["@tailwindcss/vite"] ||
      deps.webpack ||
      deps["webpack-dev-server"] ||
      deps.next ||
      deps["react-scripts"] ||
      deps.parcel,
  );

  const hasFramework = Boolean(deps.react || deps.vue || deps.svelte);
  const hasDevScript = Boolean(pkg.scripts?.dev || pkg.scripts?.start);

  return hasBundlerTool || (hasFramework && hasDevScript);
}

function hasAppEntryFiles(files: FileContentLookup, workspaceRoot: string): boolean {
  const prefix = workspaceRoot ? `${workspaceRoot}/` : "";
  const entryCandidates = [
    `${prefix}index.html`,
    `${prefix}public/index.html`,
    `${prefix}src/main.tsx`,
    `${prefix}src/main.jsx`,
    `${prefix}src/index.tsx`,
    `${prefix}src/index.jsx`,
    `${prefix}src/index.js`,
    `${prefix}app/layout.tsx`,
    `${prefix}app/page.tsx`,
    `${prefix}pages/index.tsx`,
  ];

  return entryCandidates.some((path) => Boolean(files[path]));
}

function isOrchestratorDevScript(script: string): boolean {
  return /\b(turbo|nx run|nx dev|lerna run|pnpm\s+(-w|--filter)|yarn workspaces)\b/i.test(script);
}

function scoreBundlerCandidate(
  packagePath: string,
  content: string,
  files: FileContentLookup,
): { score: number; profile: PreviewProjectProfile; workspaceRoot: string } | null {
  const pkg = readPackageJson(content);
  if (!pkg) return null;

  const deps = mergeDeps(pkg);
  if (!isBundlerPackage(pkg, deps)) return null;

  const devSpawn = resolveDevSpawn(files, pkg, deps);
  if (!devSpawn) return null;

  const workspaceRoot = packagePath === "package.json" ? "" : packagePath.replace(/\/package\.json$/, "");
  let score = 0;

  if (pkg.scripts?.dev) score += 20;
  if (pkg.scripts?.start) score += 10;
  if (pkg.scripts?.dev && isOrchestratorDevScript(pkg.scripts.dev)) score -= 80;
  if (deps.next) score += 40;
  if (deps.react || deps.vue || deps.svelte) score += 15;
  if (deps.vite) score += 15;
  if (workspaceRoot.startsWith("apps/")) score += 35;
  if (hasAppEntryFiles(files, workspaceRoot)) score += 30;
  if (/(?:^|\/)playground\//i.test(workspaceRoot)) score -= 40;
  if (/(?:^|\/)packages\//i.test(workspaceRoot) && !hasAppEntryFiles(files, workspaceRoot)) score -= 25;

  if (packagePath === "package.json" && isMonorepoRoot(files, pkg)) {
    score -= 30;
  }
  if (packagePath === "package.json" && /\bonly-allow\s+pnpm\b/i.test(Object.values(pkg.scripts ?? {}).join("\n"))) {
    score -= 20;
  }

  const profile: PreviewProjectProfile = {
    kind: "bundler",
    label: buildFrameworkLabel(deps),
    workspaceRoot,
    installCommands: resolveInstallCommands(files),
    devCommand: devSpawn.devCommand,
    devCommandFallbacks: devSpawn.devCommandFallbacks ?? [],
    devEnv: devSpawn.devEnv,
  };

  return { score, profile, workspaceRoot };
}

export function detectBundlerProject(packageJsonContent: string): PreviewProjectProfile | null {
  return scoreBundlerCandidate("package.json", packageJsonContent, {})?.profile ?? null;
}

export function resolvePreviewProject(files: FileContentLookup): PreviewProjectProfile {
  const candidates: Array<{ score: number; profile: PreviewProjectProfile; workspaceRoot: string }> = [];

  for (const [path, file] of Object.entries(files)) {
    if (!path.endsWith("package.json")) continue;
    const scored = scoreBundlerCandidate(path, file.content, files);
    if (scored) candidates.push(scored);
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const label = best.workspaceRoot ? `${best.profile.label} (${best.workspaceRoot})` : best.profile.label;
    return { ...best.profile, label };
  }

  return {
    kind: "static",
    label: "정적 HTML",
    workspaceRoot: "",
    installCommands: [],
    devCommand: [],
    devCommandFallbacks: [],
    devEnv: {},
  };
}
