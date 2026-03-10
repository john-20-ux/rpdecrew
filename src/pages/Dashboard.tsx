import { useMemo } from "react";
import { ListChecks, CheckCircle2, Clock, Timer, TrendingUp, Users } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { TasksOverTimeChart } from "@/components/dashboard/TasksOverTimeChart";
import { StageDistributionChart } from "@/components/dashboard/StageDistributionChart";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { getPreviousPeriodRange } from "@/lib/date-utils";
import { useSheetTasks } from "@/hooks/useSheetTasks";
import { isWithinInterval, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ExportBar } from "@/components/ExportBar";
import { Link } from "react-router-dom";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DASHBOARD_CHARTS = [
  { id: "tasks-over-time", label: "Tasks Over Time" },
  { id: "stage-distribution", label: "Stage Distribution" },
];

export default function Dashboard() {
  const { tasks, loading, hasData } = useFilteredTasks();
  const { dateRange } = useDateFilter();
  const { data: allTasks } = useSheetTasks();

  const prevRange = useMemo(() => getPreviousPeriodRange(dateRange), [dateRange]);
  const prevTasks = useMemo(
    () =>
      (allTasks || []).filter((t) => {
        if (!t.date_worked) return false;
        try {
          return isWithinInterval(parseISO(t.date_worked), { start: prevRange.from, end: prevRange.to });
        } catch { return false; }
      }),
    [allTasks, prevRange]
  );

  const metrics = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const prevCompleted = prevTasks.filter((t) => t.status === "Completed");
    const totalHours = tasks.reduce((s, t) => s + t.hours_spent, 0);
    const prevHours = prevTasks.reduce((s, t) => s + t.hours_spent, 0);
    const owners = new Set(tasks.map((t) => t.owner));

    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? 0 : ((curr - prev) / prev) * 100;

    return {
      totalTasks: tasks.length,
      totalTasksChange: pctChange(tasks.length, prevTasks.length),
      completedTasks: completed.length,
      completedChange: pctChange(completed.length, prevCompleted.length),
      totalHours: totalHours.toFixed(1),
      hoursChange: pctChange(totalHours, prevHours),
      avgHours: tasks.length > 0 ? (totalHours / tasks.length).toFixed(1) : "0",
      completionRate: tasks.length > 0 ? ((completed.length / tasks.length) * 100).toFixed(1) : "0",
      activeMembers: owners.size,
    };
  }, [tasks, prevTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Database className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="font-medium">No data connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect a Google Sheet to see your dashboard</p>
        </div>
        <Link to="/data-sources">
          <Button>Connect Data Source</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your team's engineering productivity
          </p>
        </div>
        <ExportBar tasks={tasks} chartIds={DASHBOARD_CHARTS} />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Tasks" value={metrics.totalTasks} change={metrics.totalTasksChange} icon={<ListChecks className="h-4 w-4" />} delay={0} />
        <KPICard title="Completed" value={metrics.completedTasks} change={metrics.completedChange} icon={<CheckCircle2 className="h-4 w-4" />} delay={0.05} />
        <KPICard title="Total Hours" value={metrics.totalHours} change={metrics.hoursChange} icon={<Clock className="h-4 w-4" />} delay={0.1} />
        <KPICard title="Avg Hours/Task" value={metrics.avgHours} icon={<Timer className="h-4 w-4" />} delay={0.15} />
        <KPICard title="Completion Rate" value={`${metrics.completionRate}%`} icon={<TrendingUp className="h-4 w-4" />} delay={0.2} />
        <KPICard title="Active Members" value={metrics.activeMembers} icon={<Users className="h-4 w-4" />} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TasksOverTimeChart tasks={tasks} />
        <StageDistributionChart tasks={tasks} />
      </div>
    </div>
  );
}
