import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { STAGE_COLORS, STAGES, type Stage } from "@/lib/stage-colors";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { eachDayOfInterval, format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { ListChecks, CheckCircle2, Clock, Timer } from "lucide-react";

export default function IndividualProfile() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || "");
  const allTasks = useFilteredTasks();
  const { dateRange } = useDateFilter();

  const tasks = useMemo(() => allTasks.filter((t) => t.owner === decodedName), [allTasks, decodedName]);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const hours = tasks.reduce((s, t) => s + t.hours_spent, 0);
    return {
      total: tasks.length,
      completed: completed.length,
      hours: Math.round(hours * 10) / 10,
      avgHours: tasks.length > 0 ? Math.round((hours / tasks.length) * 10) / 10 : 0,
    };
  }, [tasks]);

  const timelineData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const weekSize = Math.max(1, Math.ceil(days.length / 20));
    const buckets: { label: string; completed: number }[] = [];
    for (let i = 0; i < days.length; i += weekSize) {
      const bucket = days.slice(i, i + weekSize);
      const label = format(bucket[0], "MMM d");
      const bucketDates = new Set(bucket.map((d) => format(d, "yyyy-MM-dd")));
      const count = tasks.filter((t) => bucketDates.has(t.date_worked) && t.status === "Completed").length;
      buckets.push({ label, completed: count });
    }
    return buckets;
  }, [tasks, dateRange]);

  const stageData = useMemo(() => {
    const counts: Record<string, number> = {};
    const hours: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.stage] = (counts[t.stage] || 0) + 1;
      hours[t.stage] = (hours[t.stage] || 0) + t.hours_spent;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, hours: Math.round((hours[name] || 0) * 10) / 10, color: STAGE_COLORS[name as Stage] }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
        <Link to="/individuals">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{decodedName}</h1>
          <p className="text-sm text-muted-foreground">Individual performance analytics</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Tasks Worked" value={stats.total} icon={<ListChecks className="h-4 w-4" />} delay={0} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4" />} delay={0.05} />
        <KPICard title="Hours Spent" value={stats.hours} icon={<Clock className="h-4 w-4" />} delay={0.1} />
        <KPICard title="Avg Hrs/Task" value={stats.avgHours} icon={<Timer className="h-4 w-4" />} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Tasks Completed Over Time</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="completed" stroke="hsl(221, 83%, 53%)" fill="url(#profGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Stage Distribution</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {stageData.map((s) => <Cell key={s.name} fill={s.color} stroke="transparent" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Hours per Stage</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {stageData.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
