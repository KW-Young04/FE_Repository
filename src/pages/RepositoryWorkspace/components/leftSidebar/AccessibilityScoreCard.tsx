import AccessibilityDonutChart from "../charts/AccessibilityDonutChart";
import type { AccessibilityScoreSummary } from "../../types";

interface AccessibilityScoreCardProps {
  score: AccessibilityScoreSummary;
}

export default function AccessibilityScoreCard({ score }: AccessibilityScoreCardProps) {
  return (
    <section className="px-2.5 pt-4 pb-3">
      <h2 className="px-0.5 text-[11px] font-bold text-slate-800">웹 접근성 검사 점수</h2>

      <div className="mt-4 flex items-center gap-4">
        <AccessibilityDonutChart score={score} />

        <ul className="space-y-2">
          {score.categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-2 text-xs font-medium text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              {category.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
