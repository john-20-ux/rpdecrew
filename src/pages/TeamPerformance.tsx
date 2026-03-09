import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell
} from "recharts";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { STAGE_COLORS, STAGES, type Stage } from "@/lib/stage-colors";
import { TEAM_MEMBERS } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import { Link } from "react-router-dom";

const PERSON_COLORS = [
  "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)", "hsl(0, 84%, 60%)", "hsl(199, 89%, 48%)",
  "hsl(328, 81%, 65%)", "hsl(15, 75%, 50%)",
];

export default function TeamPerformance() {
  const tasks = useFilteredTasks();

  const memberStats = useMemo(() => {
    const stats = TEAM_MEMBERS.map((name) => {
      const memberTasks = tasks.filter((t) => t.owner === name);
      const completed = memberTasks.filter((t) => t.status === "Completed");
      const hours = memberTasks.reduce((s, t) => s + t.hours_spent, 0);
      const stageCounts: Record<string, number> = {};
      memberTasks.forEach((t) => { stageCounts[t.stage] = (stageCounts[t.stage] || 0) + 1; });
      const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

      return {
        name,
        tasksWorked: memberTasks.length,
        completed: completed.length,
        hours: Math.round(hours * 10) / 10,
        avgHours: memberTasks.length > 0 ? Math.round((hours / memberTasks.length) * 10) / 10 : 0,
        completionRate: memberTasks.length > 0 ? Math.round((completed.length / memberTasks.length) * 100) : 0,
        topStage,
        stageCounts,
      };
    }).filter((s) => s.tasksWorked > 0);

    return stats.sort((a, b) => b.completed - a.completed);
  }, [tasks]);

  const barChartData = useMemo(
    () => memberStats.map((s) => ({ name: s.name.split(" ")[0], completed: s.completed, hours: s.hours })),
    [memberStats]
  );

  const stackedData = useMemo(() => {
    return memberStats.map((s) => {
      const row: Record<string, string | number> = { name: s.name.split(" ")[0] };
      STAGES.forEach((stage) => { row[stage] = s.stageCounts[stage] || 0; });
      return row;
    });
  }, [memberStats]);

  const leaderboard = memberStats.slice(0, 5);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold tracking-tight">Team Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">Detailed team member productivity analytics</p>
      </motion.div>

      {/* Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">🏆 Top Performers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {leaderboard.map((member, i) => (
            <Link key={member.name} to={`/individuals/${encodeURIComponent(member.name)}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                {i === 0 ? <Trophy className="h-4 w-4" /> : i === 1 ? <Medal className="h-4 w-4" /> : i === 2 ? <Award className="h-4 w-4" /> : `#${i + 1}`}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.completed} completed · {member.hours}h</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Tasks Completed by Person</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="completed" radius={[0, 6, 6, 0]} animationDuration={800}>
                  {barChartData.map((_, i) => <Cell key={i} fill={PERSON_COLORS[i % PERSON_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Stage Workload by Person</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                {STAGES.map((stage) => (
                  <Bar key={stage} dataKey={stage} stackId="a" fill={STAGE_COLORS[stage]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Metrics Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card">
        <div className="p-5 pb-0">
          <h3 className="text-sm font-semibold mb-4">Detailed Metrics</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Avg Hrs/Task</TableHead>
              <TableHead className="text-right">Completion %</TableHead>
              <TableHead>Top Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberStats.map((m) => (
              <TableRow key={m.name}>
                <TableCell>
                  <Link to={`/individuals/${encodeURIComponent(m.name)}`} className="font-medium text-primary hover:underline">
                    {m.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">{m.tasksWorked}</TableCell>
                <TableCell className="text-right font-mono">{m.completed}</TableCell>
                <TableCell className="text-right font-mono">{m.hours}</TableCell>
                <TableCell className="text-right font-mono">{m.avgHours}</TableCell>
                <TableCell className="text-right font-mono">{m.completionRate}%</TableCell>
                <TableCell className="text-xs">{m.topStage}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
