import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type Task } from "@/lib/mock-data";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { useDateFilter } from "@/contexts/DateFilterContext";

interface Props {
  tasks: Task[];
}

export function TasksOverTimeChart({ tasks }: Props) {
  const { dateRange } = useDateFilter();

  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const tasksByDay = new Map<string, number>();
    tasks.forEach((t) => {
      const key = t.date_worked.split("T")[0];
      tasksByDay.set(key, (tasksByDay.get(key) || 0) + 1);
    });

    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "MMM d"),
        tasks: tasksByDay.get(key) || 0,
      };
    });
  }, [tasks, dateRange]);

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-chart-id="tasks-over-time">
      <h3 className="text-sm font-semibold mb-4">Tasks Over Time</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="tasks"
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              fill="url(#taskGrad)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
