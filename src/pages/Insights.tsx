import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { TEAM_MEMBERS } from "@/lib/mock-data";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stage-colors";
import { Lightbulb, TrendingUp, AlertTriangle, Zap } from "lucide-react";

interface Insight {
  type: "info" | "warning" | "success" | "tip";
  title: string;
  description: string;
}

export default function Insights() {
  const tasks = useFilteredTasks();

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const totalTasks = tasks.length;
    if (totalTasks === 0) return result;

    // Stage distribution insights
    const stageCounts: Record<string, number> = {};
    tasks.forEach((t) => { stageCounts[t.stage] = (stageCounts[t.stage] || 0) + 1; });
    const sortedStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);

    if (sortedStages[0]) {
      const pct = Math.round((sortedStages[0][1] / totalTasks) * 100);
      result.push({
        type: "info",
        title: `${sortedStages[0][0]} dominates workload`,
        description: `${sortedStages[0][0]} accounts for ${pct}% of all tasks (${sortedStages[0][1]} tasks). Consider if this aligns with team priorities.`,
      });
    }

    // Bug ratio
    const bugCount = stageCounts["Bug"] || 0;
    const bugPct = Math.round((bugCount / totalTasks) * 100);
    if (bugPct > 15) {
      result.push({
        type: "warning",
        title: `High bug ratio: ${bugPct}%`,
        description: `${bugCount} bug tasks out of ${totalTasks} total. This may indicate quality issues in recent releases.`,
      });
    }

    // Per-member workload
    const memberHours = TEAM_MEMBERS.map((name) => {
      const memberTasks = tasks.filter((t) => t.owner === name);
      return { name, hours: memberTasks.reduce((s, t) => s + t.hours_spent, 0), tasks: memberTasks.length };
    }).filter((m) => m.tasks > 0).sort((a, b) => b.hours - a.hours);

    if (memberHours.length >= 2) {
      const top = memberHours[0];
      const bottom = memberHours[memberHours.length - 1];
      if (top.hours > bottom.hours * 2.5) {
        result.push({
          type: "warning",
          title: "Workload imbalance detected",
          description: `${top.name} has logged ${top.hours.toFixed(0)}h while ${bottom.name} has ${bottom.hours.toFixed(0)}h. Consider rebalancing assignments.`,
        });
      }
    }

    // Top performer
    const completionRates = TEAM_MEMBERS.map((name) => {
      const mt = tasks.filter((t) => t.owner === name);
      const completed = mt.filter((t) => t.status === "Completed").length;
      return { name, rate: mt.length > 0 ? completed / mt.length : 0, count: mt.length };
    }).filter((m) => m.count >= 5).sort((a, b) => b.rate - a.rate);

    if (completionRates[0]) {
      result.push({
        type: "success",
        title: `${completionRates[0].name} leads completion rate`,
        description: `${Math.round(completionRates[0].rate * 100)}% completion rate across ${completionRates[0].count} tasks. Outstanding execution!`,
      });
    }

    // Fastest worker per stage
    const stageAvgHours: Record<string, { total: number; count: number }> = {};
    tasks.forEach((t) => {
      if (!stageAvgHours[t.stage]) stageAvgHours[t.stage] = { total: 0, count: 0 };
      stageAvgHours[t.stage].total += t.hours_spent;
      stageAvgHours[t.stage].count++;
    });
    const optimizationHours = stageAvgHours["Optimization"];
    if (optimizationHours && optimizationHours.count > 5) {
      const avg = optimizationHours.total / optimizationHours.count;
      result.push({
        type: "tip",
        title: "Optimization tasks average " + avg.toFixed(1) + "h each",
        description: "Consider investing in automation tools to reduce time spent on optimization tasks.",
      });
    }

    // General recommendations
    result.push({
      type: "tip",
      title: "Recommendation: Review edge case coverage",
      description: `${stageCounts["Edge Cases"] || 0} edge case tasks suggests active quality work. Ensure test coverage tracks these patterns.`,
    });

    return result;
  }, [tasks]);

  const iconMap = {
    info: <Lightbulb className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    success: <TrendingUp className="h-4 w-4" />,
    tip: <Zap className="h-4 w-4" />,
  };

  const colorMap = {
    info: "border-info/30 bg-info/5",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
    tip: "border-primary/30 bg-primary/5",
  };

  const iconColorMap = {
    info: "text-info",
    warning: "text-warning",
    success: "text-success",
    tip: "text-primary",
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Insights & Recommendations</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered and rule-based insights from your team data</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border p-5 ${colorMap[insight.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${iconColorMap[insight.type]}`}>{iconMap[insight.type]}</div>
              <div>
                <h3 className="text-sm font-semibold">{insight.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
