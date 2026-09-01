import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { AccessibilityScoreSummary } from "../../types";
import { buildScoreChartData } from "../../utils/scoreChartData";

interface AccessibilityDonutChartProps {
  score: AccessibilityScoreSummary;
}

export default function AccessibilityDonutChart({ score }: AccessibilityDonutChartProps) {
  const chartData = buildScoreChartData(score);

  return (
    <div className="relative h-[102px] w-[102px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {chartData.map((segment) => (
              <Cell key={segment.id} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <p className="text-lg font-extrabold text-slate-950">{score.totalScore}점</p>
      </div>
    </div>
  );
}
