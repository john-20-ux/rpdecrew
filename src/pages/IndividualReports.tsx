import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { TEAM_MEMBERS } from "@/lib/mock-data";
import { STAGE_COLORS, type Stage } from "@/lib/stage-colors";
import { UserCircle } from "lucide-react";

export default function IndividualReports() {
  const tasks = useFilteredTasks();

  const members = useMemo(() => {
    return TEAM_MEMBERS.map((name) => {
      const memberTasks = tasks.filter((t) => t.owner === name);
      const completed = memberTasks.filter((t) => t.status === "Completed").length;
      const hours = memberTasks.reduce((s, t) => s + t.hours_spent, 0);
      const stageCounts: Record<string, number> = {};
      memberTasks.forEach((t) => { stageCounts[t.stage] = (stageCounts[t.stage] || 0) + 1; });
      const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
      return { name, tasks: memberTasks.length, completed, hours: Math.round(hours * 10) / 10, topStage };
    }).filter((m) => m.tasks > 0);
  }, [tasks]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Individual Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Click a team member to view their detailed analytics</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {members.map((m, i) => (
          <motion.div key={m.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/individuals/${encodeURIComponent(m.name)}`} className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.topStage}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold font-mono">{m.tasks}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Tasks</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono">{m.completed}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono">{m.hours}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Hours</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
