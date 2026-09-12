export interface PreviewIssueOverlayBox {
  id: string;
  code: string;
  title: string;
  level: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PreviewIssueOverlaysProps {
  overlays: PreviewIssueOverlayBox[];
}

export default function PreviewIssueOverlays({ overlays }: PreviewIssueOverlaysProps) {
  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((issue) => {
        const labelOutside = issue.top >= 44;

        return (
          <div
            key={issue.id}
            className="pointer-events-none absolute rounded-2xl border-[1.5px] border-dashed border-[#ff5656]"
            style={{
              left: issue.left,
              top: issue.top,
              width: issue.width,
              height: issue.height,
            }}
          >
            <span
              className={[
                "absolute left-3 flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-[#ff9aa0] px-3 text-xs font-bold text-[#8d1f26]",
                labelOutside ? "top-[-39px]" : "top-2",
              ].join(" ")}
            >
              <strong className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3845] px-1 text-[10px] text-white">
                {issue.level}
              </strong>
              {issue.code} {issue.title}
            </span>
          </div>
        );
      })}
    </>
  );
}
