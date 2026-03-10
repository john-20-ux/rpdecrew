import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { type Task } from "@/lib/mock-data";
import { STAGE_COLORS, type Stage } from "@/lib/stage-colors";

interface Props {
  tasks: Task[];
}

export function StageDistributionChart({ tasks }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.stage] = (counts[t.stage] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: STAGE_COLORS[name as Stage] || "hsl(220, 9%, 46%)" }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-chart-id="stage-distribution">
      <h3 className="text-sm font-semibold mb-4">Stage Distribution</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={55}
              paddingAngle={2}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
