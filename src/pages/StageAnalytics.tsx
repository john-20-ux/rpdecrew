import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { STAGE_COLORS, STAGES, type Stage } from "@/lib/stage-colors";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportBar } from "@/components/ExportBar";

const STAGE_CHARTS = [
  { id: "stage-pie", label: "Task Distribution" },
  { id: "hours-per-stage", label: "Hours per Stage" },
  { id: "stage-trends", label: "Stage Trends" },
];

export default function StageAnalytics() {
  const tasks = useFilteredTasks();
  const { dateRange } = useDateFilter();

  const stageStats = useMemo(() => {
    return STAGES.map((stage) => {
      const stageTasks = tasks.filter((t) => t.stage === stage);
      const hours = stageTasks.reduce((s, t) => s + t.hours_spent, 0);
      const completed = stageTasks.filter((t) => t.status === "Completed");
      return {
        name: stage,
        tasks: stageTasks.length,
        hours: Math.round(hours * 10) / 10,
        avgHours: stageTasks.length > 0 ? Math.round((hours / stageTasks.length) * 10) / 10 : 0,
        completionRate: stageTasks.length > 0 ? Math.round((completed.length / stageTasks.length) * 100) : 0,
        color: STAGE_COLORS[stage],
      };
    }).filter((s) => s.tasks > 0).sort((a, b) => b.tasks - a.tasks);
  }, [tasks]);

  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    // Group into weekly buckets for readability
    const weekSize = Math.max(1, Math.ceil(days.length / 15));
    const buckets: Record<string, string | number>[] = [];

    for (let i = 0; i < days.length; i += weekSize) {
      const bucket = days.slice(i, i + weekSize);
      const label = format(bucket[0], "MMM d");
      const row: Record<string, string | number> = { label };
      const bucketDates = new Set(bucket.map((d) => format(d, "yyyy-MM-dd")));

      const bucketTasks = tasks.filter((t) => bucketDates.has(t.date_worked));
      STAGES.forEach((stage) => {
        row[stage] = bucketTasks.filter((t) => t.stage === stage).length;
      });
      buckets.push(row);
    }
    return buckets;
  }, [tasks, dateRange]);

  const topStages = stageStats.slice(0, 6).map((s) => s.name);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stage Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Work distribution across engineering stages</p>
        </div>
        <ExportBar tasks={tasks} chartIds={STAGE_CHARTS} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5" data-chart-id="stage-pie">
          <h3 className="text-sm font-semibold mb-4">Task Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageStats} dataKey="tasks" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                  {stageStats.map((s) => <Cell key={s.name} fill={s.color} stroke="transparent" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Hours bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Hours per Stage</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageStats} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                  {stageStats.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Trends */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Stage Trends Over Time</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {topStages.map((stage) => (
                <Line key={stage} type="monotone" dataKey={stage} stroke={STAGE_COLORS[stage as Stage]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card">
        <div className="p-5 pb-0"><h3 className="text-sm font-semibold mb-4">Stage Breakdown</h3></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Avg Hrs/Task</TableHead>
              <TableHead className="text-right">Completion %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stageStats.map((s) => (
              <TableRow key={s.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{s.tasks}</TableCell>
                <TableCell className="text-right font-mono">{s.hours}</TableCell>
                <TableCell className="text-right font-mono">{s.avgHours}</TableCell>
                <TableCell className="text-right font-mono">{s.completionRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
