import { useMemo } from "react";
import { ListChecks, CheckCircle2, Clock, Timer, TrendingUp, Users } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { TasksOverTimeChart } from "@/components/dashboard/TasksOverTimeChart";
import { StageDistributionChart } from "@/components/dashboard/StageDistributionChart";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { getPreviousPeriodRange } from "@/lib/date-utils";
import { MOCK_TASKS } from "@/lib/mock-data";
import { isWithinInterval, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const tasks = useFilteredTasks();
  const { dateRange } = useDateFilter();

  const prevRange = useMemo(() => getPreviousPeriodRange(dateRange), [dateRange]);
  const prevTasks = useMemo(
    () =>
      MOCK_TASKS.filter((t) =>
        isWithinInterval(parseISO(t.date_worked), { start: prevRange.from, end: prevRange.to })
      ),
    [prevRange]
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

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your team's engineering productivity
        </p>
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
