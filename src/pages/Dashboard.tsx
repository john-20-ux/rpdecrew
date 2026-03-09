import { useMemo } from "react";
import { ListChecks, CheckCircle2, Clock, Timer, TrendingUp, Users } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { TasksOverTimeChart } from "@/components/dashboard/TasksOverTimeChart";
import { StageDistributionChart } from "@/components/dashboard/StageDistributionChart";
import { useSheetTasks } from "@/hooks/useSheetTasks";
import { DataSourceBar } from "@/components/google/DataSourceBar";
import { motion } from "framer-motion";
import { ExportBar } from "@/components/ExportBar";
import { Loader2 } from "lucide-react";

const DASHBOARD_CHARTS = [
  { id: "tasks-over-time", label: "Tasks Over Time" },
  { id: "stage-distribution", label: "Stage Distribution" },
];

export default function Dashboard() {
  const { tasks, activeSheet, loading, syncing, syncData, fetchTasks } = useSheetTasks();

  const metrics = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const totalHours = tasks.reduce((s, t) => s + t.hours_spent, 0);
    const owners = new Set(tasks.map((t) => t.owner).filter(Boolean));

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      totalHours: totalHours.toFixed(1),
      avgHours: tasks.length > 0 ? (totalHours / tasks.length).toFixed(1) : "0",
      completionRate: tasks.length > 0 ? ((completed.length / tasks.length) * 100).toFixed(1) : "0",
      activeMembers: owners.size,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your team's engineering productivity
          </p>
        </div>
        {tasks.length > 0 && <ExportBar tasks={tasks} chartIds={DASHBOARD_CHARTS} />}
      </motion.div>

      <DataSourceBar
        activeSheet={activeSheet}
        syncing={syncing}
        onSync={syncData}
        onSheetConnected={fetchTasks}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading data...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {activeSheet ? "No tasks found in the selected date range." : "Connect a Google Sheet to see your data here."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard title="Total Tasks" value={metrics.totalTasks} icon={<ListChecks className="h-4 w-4" />} delay={0} />
            <KPICard title="Completed" value={metrics.completedTasks} icon={<CheckCircle2 className="h-4 w-4" />} delay={0.05} />
            <KPICard title="Total Hours" value={metrics.totalHours} icon={<Clock className="h-4 w-4" />} delay={0.1} />
            <KPICard title="Avg Hours/Task" value={metrics.avgHours} icon={<Timer className="h-4 w-4" />} delay={0.15} />
            <KPICard title="Completion Rate" value={`${metrics.completionRate}%`} icon={<TrendingUp className="h-4 w-4" />} delay={0.2} />
            <KPICard title="Active Members" value={metrics.activeMembers} icon={<Users className="h-4 w-4" />} delay={0.25} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TasksOverTimeChart tasks={tasks} />
            <StageDistributionChart tasks={tasks} />
          </div>
        </>
      )}
    </div>
  );
}
