import type { AccessibilityScoreSummary } from "../../types";
import AccessibilityDonutChart from "../charts/AccessibilityDonutChart";

interface AccessibilityScoreCardProps {
  score: AccessibilityScoreSummary;
}

export default function AccessibilityScoreCard({ score }: AccessibilityScoreCardProps) {
  return (
    <div className="mx-2 mt-[9px] mb-[57px] min-h-[166px] rounded-[15px] border border-[#e9e8ee] bg-white px-3.5 pt-3.5 pb-3 shadow-[0_1px_2px_rgb(23_23_28/3%)] max-[1360px]:mb-9">
      <h2 className="mt-0 mb-[9px] text-[11px] font-bold">웹 접근성 검사 점수</h2>
      <div className="mb-[9px] h-px bg-[#ececf0]" />

      <div className="flex items-center justify-center gap-5">
        <AccessibilityDonutChart score={score} />

        <ul className="grid gap-[11px] whitespace-nowrap text-[10px] font-semibold">
          {score.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-[7px]">
              <span
                className="size-2.5 rounded-full border-[3px]"
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
