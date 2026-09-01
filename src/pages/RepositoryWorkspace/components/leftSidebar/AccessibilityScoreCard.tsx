import type { AccessibilityScoreSummary } from "../../types";
import AccessibilityDonutChart from "../charts/AccessibilityDonutChart";

interface AccessibilityScoreCardProps {
  score: AccessibilityScoreSummary;
}

export default function AccessibilityScoreCard({ score }: AccessibilityScoreCardProps) {
  return (
    <div className="mx-[9px] mt-[10px] mb-[67px] min-h-[182px] rounded-[16px] border border-[#e9e8ee] bg-white px-[15px] pt-[15px] pb-3.5 shadow-[0_1px_2px_rgb(23_23_28/8%)] max-[1360px]:mb-[52px]">
      <h2 className="mt-0 mb-[10px] text-[13px] font-bold">웹 접근성 검사 점수</h2>
      <div className="mb-[9px] h-px bg-[#ececf0]" />

      <div className="flex items-center justify-center gap-5">
        <AccessibilityDonutChart score={score} />

        <ul className="grid gap-[11px] whitespace-nowrap text-[12px] font-semibold">
          {score.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-[7px]">
              <span
                className="size-3 rounded-full border-[3px]"
                style={{ borderColor: category.color }}
                aria-hidden="true"
              />
              {category.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
