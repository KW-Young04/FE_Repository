const ENTRY_CANDIDATES = [
  "index.html",
  "index.htm",
  "public/index.html",
  "public/index.htm",
  "src/main.tsx",
  "src/main.jsx",
  "src/index.tsx",
  "src/index.jsx",
  "src/App.tsx",
  "src/App.jsx",
  "app/page.tsx",
  "app/layout.tsx",
  "pages/index.tsx",
  "pages/index.jsx",
];

export function buildSnapshotMeta(
  filesByPath: Record<string, { path: string }>,
  previewEntryPath: string | null,
): string[] {
  const paths = new Set<string>();

  if (previewEntryPath) {
    paths.add(previewEntryPath);
  }

  for (const candidate of ENTRY_CANDIDATES) {
    if (filesByPath[candidate]) {
      paths.add(candidate);
    }
  }

  return Array.from(paths);
}
