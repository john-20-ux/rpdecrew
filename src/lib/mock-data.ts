import { subDays, format, addHours } from "date-fns";
import { STAGES, type Stage } from "./stage-colors";

export interface Task {
  id: string;
  date_worked: string;
  task_link: string;
  status: "Completed" | "In Progress" | "To Do" | "Blocked";
  owner: string;
  stage: Stage;
  completed_at: string | null;
  created_at: string;
  notes: string;
  hours_spent: number;
}

const TEAM_MEMBERS = [
  "Sarah Chen", "Marcus Johnson", "Emily Rodriguez", "James Kim",
  "Priya Patel", "Alex Thompson", "David Okafor", "Lisa Nakamura",
];

const STATUS_WEIGHTS = [
  { value: "Completed" as const, weight: 60 },
  { value: "In Progress" as const, weight: 25 },
  { value: "To Do" as const, weight: 10 },
  { value: "Blocked" as const, weight: 5 },
];

const STAGE_WEIGHTS: { value: Stage; weight: number }[] = [
  { value: "Bug", weight: 18 },
  { value: "Feature", weight: 22 },
  { value: "Optimization", weight: 10 },
  { value: "New Sync", weight: 8 },
  { value: "Edge Cases", weight: 8 },
  { value: "Third Party", weight: 6 },
  { value: "Schedule Modifications", weight: 5 },
  { value: "Server Fixes", weight: 7 },
  { value: "Analysis", weight: 6 },
  { value: "App Improvements", weight: 6 },
  { value: "Ticket Analysis", weight: 4 },
];

function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMockTasks(count = 500): Task[] {
  const rand = seededRandom(42);
  const tasks: Task[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rand() * 120);
    const date = subDays(now, daysAgo);
    const dateStr = format(date, "yyyy-MM-dd");
    const owner = TEAM_MEMBERS[Math.floor(rand() * TEAM_MEMBERS.length)];
    const stage = weightedRandom(STAGE_WEIGHTS);
    const status = weightedRandom(STATUS_WEIGHTS);
    const hours = Math.round((0.5 + rand() * 7.5) * 2) / 2;
    const createdAt = addHours(date, -Math.floor(rand() * 48));
    const completedAt = status === "Completed" ? addHours(date, Math.floor(rand() * 8)) : null;

    tasks.push({
      id: `task-${i + 1}`,
      date_worked: dateStr,
      task_link: `https://basecamp.com/project/todo/${1000 + i}`,
      status,
      owner,
      stage,
      completed_at: completedAt ? completedAt.toISOString() : null,
      created_at: createdAt.toISOString(),
      notes: `${stage} task for ${owner}`,
      hours_spent: hours,
    });
  }

  return tasks;
}

export const MOCK_TASKS = generateMockTasks();
export { TEAM_MEMBERS };
